const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole, requirePermission, requireActionItemOwnerOrAdmin } = require('../middleware/role.middleware')
const actionItemService = require('../services/actionItem.service')
const { log } = require('../services/auditLog.service')

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
router.post('/workspace/:workspaceId', protect, requireRole('MEMBER'), requirePermission('canManageActionItems'), async (req, res) => {
  try {
    const item = await actionItemService.createActionItem({
      ...req.body,
      workspaceId: parseInt(req.params.workspaceId),
      createdById: req.user.id  // Set the creator to current user
    })

    await log({
      workspaceId: parseInt(req.params.workspaceId),
      userId: req.user.id,
      action: 'ACTION_ITEM_CREATED',
      metadata: { actionItemId: item.id, title: item.title }
    })

    res.status(201).json({ success: true, data: item })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/action-items/:id
router.put('/:id', protect, requireActionItemOwnerOrAdmin, async (req, res) => {
  try {
    const item = await actionItemService.updateActionItem(
      parseInt(req.params.id),
      req.body
    )

    await log({
      workspaceId: item.workspaceId,
      userId: req.user.id,
      action: 'ACTION_ITEM_UPDATED',
      metadata: { actionItemId: parseInt(req.params.id) }
    })

    res.json({ success: true, data: item })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/action-items/:id
router.delete('/:id', protect, requireActionItemOwnerOrAdmin, async (req, res) => {
  try {
    await actionItemService.deleteActionItem(parseInt(req.params.id))
    res.json({ success: true, message: 'Action item deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/action-items/:id/status - update status (admin or creator only)
router.put('/:id/status', protect, requireActionItemOwnerOrAdmin, async (req, res) => {
  try {
    const item = await actionItemService.updateActionItem(
      parseInt(req.params.id),
      { status: req.body.status }
    )

    const io = req.app.get('io')

    io.to(`workspace:${item.workspaceId}`).emit('actionItem:statusChanged', {
      actionItemId: item.id,
      status: item.status
    })

    res.json({ success: true, data: item })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router