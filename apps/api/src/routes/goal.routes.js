const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const {
  requireRole,
  requirePermission,
  requireResourceMember,
  isWorkspaceMember
} = require('../middleware/role.middleware')
const goalService = require('../services/goal.service')
const { log } = require('../services/auditLog.service')
const pick = require('../lib/pick')
const { GOAL_STATUSES } = require('@teamhub/shared')

const GOAL_FIELDS = ['title', 'dueDate', 'status', 'ownerId']

// validate + normalise a goal payload; returns { data } or { error }
const parseGoalBody = async (body, workspaceId) => {
  const data = pick(body, GOAL_FIELDS)

  if (data.title !== undefined && !String(data.title).trim()) {
    return { error: 'Title is required' }
  }
  if (data.status !== undefined && !GOAL_STATUSES.includes(data.status)) {
    return { error: 'Invalid status' }
  }
  if (data.dueDate !== undefined) {
    data.dueDate = data.dueDate ? new Date(data.dueDate) : null
  }
  if (data.ownerId !== undefined) {
    data.ownerId = parseInt(data.ownerId)
    if (!(await isWorkspaceMember(workspaceId, data.ownerId))) {
      return { error: 'Owner must be a member of this workspace' }
    }
  }
  return { data }
}

// only the goal owner or a workspace admin may edit/delete a goal
const requireGoalOwnerOrAdmin = (req, res, next) => {
  if (req.userRole === 'ADMIN' || req.resource.ownerId === req.user.id) return next()
  return res.status(403).json({
    success: false,
    message: 'Only the goal owner or an admin can do this'
  })
}

const clampProgress = (value) => Math.min(100, Math.max(0, parseInt(value) || 0))

/**
 * GET /api/goals/workspace/:workspaceId
 */
router.get('/workspace/:workspaceId', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const goals = await goalService.getGoalsByWorkspace(parseInt(req.params.workspaceId))
    res.json({ success: true, data: goals })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/goals/workspace/:workspaceId
 */
router.post(
  '/workspace/:workspaceId',
  protect,
  requirePermission('canCreateGoals'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId)
      const { data, error } = await parseGoalBody(req.body, workspaceId)
      if (error) return res.status(400).json({ success: false, message: error })
      if (!data.title) return res.status(400).json({ success: false, message: 'Title is required' })

      const goal = await goalService.createGoal({
        ...data,
        ownerId: data.ownerId || req.user.id,
        workspaceId
      })

      await log({
        workspaceId,
        userId: req.user.id,
        action: 'GOAL_CREATED',
        metadata: { goalId: goal.id, title: goal.title }
      })

      req.app.get('io').to(`workspace:${workspaceId}`).emit('goal:created', goal)

      res.status(201).json({ success: true, data: goal })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/**
 * GET /api/goals/:id
 */
router.get('/:id', protect, requireResourceMember('goal'), async (req, res) => {
  try {
    const goal = await goalService.getGoalById(parseInt(req.params.id))
    res.json({ success: true, data: goal })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * PUT /api/goals/:id
 */
router.put(
  '/:id',
  protect,
  requireResourceMember('goal'),
  requireGoalOwnerOrAdmin,
  async (req, res) => {
    try {
      const { data, error } = await parseGoalBody(req.body, req.workspaceId)
      if (error) return res.status(400).json({ success: false, message: error })

      const goal = await goalService.updateGoal(parseInt(req.params.id), data)

      await log({
        workspaceId: goal.workspaceId,
        userId: req.user.id,
        action: 'GOAL_UPDATED',
        metadata: { goalId: goal.id, fields: Object.keys(data) }
      })

      if (data.status) {
        req.app.get('io').to(`workspace:${goal.workspaceId}`).emit('goal:statusChanged', {
          goalId: goal.id,
          status: goal.status
        })
      }

      res.json({ success: true, data: goal })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/**
 * DELETE /api/goals/:id
 */
router.delete(
  '/:id',
  protect,
  requireResourceMember('goal'),
  requireGoalOwnerOrAdmin,
  async (req, res) => {
    try {
      const goalId = parseInt(req.params.id)
      await goalService.deleteGoal(goalId)

      await log({
        workspaceId: req.workspaceId,
        userId: req.user.id,
        action: 'GOAL_DELETED',
        metadata: { goalId }
      })

      res.json({ success: true, message: 'Goal deleted' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/**
 * POST /api/goals/:id/updates — activity feed
 */
router.post('/:id/updates', protect, requireResourceMember('goal'), async (req, res) => {
  try {
    const content = String(req.body?.content || '').trim()
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' })

    const update = await goalService.createGoalUpdate({
      goalId: parseInt(req.params.id),
      authorId: req.user.id,
      content
    })

    req.app.get('io').to(`workspace:${req.workspaceId}`).emit('goal:updatePosted', {
      goalId: update.goalId,
      update
    })

    res.status(201).json({ success: true, data: update })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/goals/:id/milestones
 */
router.post('/:id/milestones', protect, requireResourceMember('goal'), async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim()
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' })

    const milestone = await goalService.createMilestone({
      goalId: parseInt(req.params.id),
      title,
      progress: clampProgress(req.body.progress)
    })

    res.status(201).json({ success: true, data: milestone })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * PUT /api/goals/status/:id (real-time update)
 */
router.put('/status/:id', protect, requireResourceMember('goal'), async (req, res) => {
  try {
    if (!GOAL_STATUSES.includes(req.body?.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' })
    }

    const goal = await goalService.updateGoalStatus({
      id: parseInt(req.params.id),
      status: req.body.status
    })

    await log({
      workspaceId: goal.workspaceId,
      userId: req.user.id,
      action: 'GOAL_STATUS_CHANGED',
      metadata: { goalId: goal.id, status: goal.status }
    })

    req.app.get('io').to(`workspace:${goal.workspaceId}`).emit('goal:statusChanged', {
      goalId: goal.id,
      status: goal.status
    })

    res.json({ success: true, data: goal })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * MILESTONES
 */
router.put(
  '/milestones/:milestoneId',
  protect,
  requireResourceMember('milestone', 'milestoneId'),
  async (req, res) => {
    try {
      const data = pick(req.body, ['title', 'progress'])
      if (data.progress !== undefined) data.progress = clampProgress(data.progress)

      const milestone = await goalService.updateMilestone(
        parseInt(req.params.milestoneId),
        data
      )

      res.json({ success: true, data: milestone })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

router.delete(
  '/milestones/:milestoneId',
  protect,
  requireResourceMember('milestone', 'milestoneId'),
  async (req, res) => {
    try {
      await goalService.deleteMilestone(parseInt(req.params.milestoneId))
      res.json({ success: true, message: 'Milestone deleted' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

module.exports = router
