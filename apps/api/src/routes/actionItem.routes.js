const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const {
  requireRole,
  requirePermission,
  requireResourceMember,
  isWorkspaceMember
} = require('../middleware/role.middleware')
const actionItemService = require('../services/actionItem.service')
const { log } = require('../services/auditLog.service')
const prisma = require('../lib/prisma')
const pick = require('../lib/pick')
const { PRIORITIES, ACTION_STATUSES: STATUSES } = require('@teamhub/shared')

const ITEM_FIELDS = ['title', 'goalId', 'assigneeId', 'priority', 'dueDate', 'status']

// validate + normalise an action item payload; returns { data } or { error }
const parseItemBody = async (body, workspaceId) => {
  const data = pick(body, ITEM_FIELDS)

  if (data.title !== undefined && !String(data.title).trim()) {
    return { error: 'Title is required' }
  }
  if (data.priority !== undefined && !PRIORITIES.includes(data.priority)) {
    return { error: 'Invalid priority' }
  }
  if (data.status !== undefined && !STATUSES.includes(data.status)) {
    return { error: 'Invalid status' }
  }
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null
  }
  if (data.goalId !== undefined) {
    data.goalId = data.goalId ? parseInt(data.goalId) : null
    if (data.goalId) {
      const goal = await prisma.goal.findFirst({
        where: { id: data.goalId, workspaceId },
        select: { id: true }
      })
      if (!goal) return { error: 'Goal not found in this workspace' }
    }
  }
  if (data.assigneeId !== undefined) {
    data.assigneeId = data.assigneeId ? parseInt(data.assigneeId) : null
    if (data.assigneeId && !(await isWorkspaceMember(workspaceId, data.assigneeId))) {
      return { error: 'Assignee must be a member of this workspace' }
    }
  }
  return { data }
}

const canEditItem = (req) =>
  req.userRole === 'ADMIN' || req.resource.createdById === req.user.id

// the assignee may also move their own card between columns
const canChangeStatus = (req) =>
  canEditItem(req) || req.resource.assigneeId === req.user.id

// push the full item so other clients can merge it; statusChanged kept for listeners
const broadcastItem = (req, item, statusChanged) => {
  const io = req.app.get('io')
  io.to(`workspace:${item.workspaceId}`).emit('actionItem:updated', item)
  if (statusChanged) {
    io.to(`workspace:${item.workspaceId}`).emit('actionItem:statusChanged', {
      actionItemId: item.id,
      status: item.status
    })
  }
}

// GET /api/action-items/workspace/:workspaceId
router.get('/workspace/:workspaceId', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const items = await actionItemService.getActionItemsByWorkspace(
      parseInt(req.params.workspaceId)
    )
    res.json({ success: true, data: items })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/action-items/workspace/:workspaceId
router.post(
  '/workspace/:workspaceId',
  protect,
  requirePermission('canManageActionItems'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId)
      const { data, error } = await parseItemBody(req.body, workspaceId)
      if (error) return res.status(400).json({ success: false, message: error })
      if (!data.title) return res.status(400).json({ success: false, message: 'Title is required' })

      const item = await actionItemService.createActionItem({
        priority: 'MEDIUM',
        ...data,
        workspaceId,
        createdById: req.user.id
      })

      await log({
        workspaceId,
        userId: req.user.id,
        action: 'ACTION_ITEM_CREATED',
        metadata: { actionItemId: item.id, title: item.title }
      })

      req.app.get('io').to(`workspace:${workspaceId}`).emit('actionItem:created', item)

      res.status(201).json({ success: true, data: item })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

// PUT /api/action-items/:id
// creator/admin can edit everything; the assignee can only change status
router.put('/:id', protect, requireResourceMember('actionItem'), async (req, res) => {
  try {
    const { data, error } = await parseItemBody(req.body, req.workspaceId)
    if (error) return res.status(400).json({ success: false, message: error })

    const onlyStatus = Object.keys(data).every((key) => key === 'status')
    if (!(canEditItem(req) || (onlyStatus && canChangeStatus(req)))) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator, the assignee (status only) or an admin can edit this item'
      })
    }

    const item = await actionItemService.updateActionItem(parseInt(req.params.id), data)

    await log({
      workspaceId: item.workspaceId,
      userId: req.user.id,
      action: data.status && onlyStatus ? 'ACTION_ITEM_STATUS_CHANGED' : 'ACTION_ITEM_UPDATED',
      metadata: { actionItemId: item.id, fields: Object.keys(data) }
    })

    broadcastItem(req, item, data.status !== undefined)

    res.json({ success: true, data: item })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/action-items/:id/status
router.put('/:id/status', protect, requireResourceMember('actionItem'), async (req, res) => {
  try {
    if (!STATUSES.includes(req.body?.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }
    if (!canChangeStatus(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator, the assignee or an admin can change status'
      })
    }

    const item = await actionItemService.updateActionItem(
      parseInt(req.params.id),
      { status: req.body.status }
    )

    await log({
      workspaceId: item.workspaceId,
      userId: req.user.id,
      action: 'ACTION_ITEM_STATUS_CHANGED',
      metadata: { actionItemId: item.id, status: item.status }
    })

    broadcastItem(req, item, true)

    res.json({ success: true, data: item })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/action-items/:id
router.delete('/:id', protect, requireResourceMember('actionItem'), async (req, res) => {
  try {
    if (!canEditItem(req)) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator or an admin can delete this item'
      })
    }

    const actionItemId = parseInt(req.params.id)
    await actionItemService.deleteActionItem(actionItemId)

    await log({
      workspaceId: req.workspaceId,
      userId: req.user.id,
      action: 'ACTION_ITEM_DELETED',
      metadata: { actionItemId }
    })

    req.app.get('io').to(`workspace:${req.workspaceId}`).emit('actionItem:deleted', { actionItemId })

    res.json({ success: true, message: 'Action item deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
