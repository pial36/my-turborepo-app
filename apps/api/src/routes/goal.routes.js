const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole, requirePermission } = require('../middleware/role.middleware')
const goalService = require('../services/goal.service')
const { log } = require('../services/auditLog.service')

/**
 * GET /api/workspaces/:workspaceId/goals
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
 * POST /api/workspaces/:workspaceId/goals
 * ✅ permission-based instead of role-based
 */
router.post(
  '/workspace/:workspaceId',
  protect,
  requirePermission('canCreateGoals'),
  async (req, res) => {
    try {
      const goal = await goalService.createGoal({
        ...req.body,
        workspaceId: parseInt(req.params.workspaceId),
        ownerId: req.user.id
      })

      await log({
        workspaceId: goal.workspaceId,
        userId: req.user.id,
        action: 'GOAL_CREATED',
        metadata: { goalId: goal.id, title: goal.title }
      })

      res.status(201).json({ success: true, data: goal })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/**
 * GET /api/goals/:id
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const goal = await goalService.getGoalById(parseInt(req.params.id))
    if (!goal) return res.status(404).json({ success: false, message: 'Goal not found' })
    res.json({ success: true, data: goal })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * PUT /api/goals/:id
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const goal = await goalService.updateGoal(parseInt(req.params.id), req.body)

    await log({
      workspaceId: goal.workspaceId,
      userId: req.user.id,
      action: 'GOAL_UPDATED',
      metadata: { goalId: goal.id }
    })

    res.json({ success: true, data: goal })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * DELETE /api/goals/:id
 */
router.delete('/:id', protect, async (req, res) => {
  try {
    const goal = await goalService.getGoalById(parseInt(req.params.id))

    await goalService.deleteGoal(parseInt(req.params.id))

    await log({
      workspaceId: goal.workspaceId,
      userId: req.user.id,
      action: 'GOAL_DELETED',
      metadata: { goalId: goal.id }
    })

    res.json({ success: true, message: 'Goal deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * POST /api/goals/:id/updates
 */
router.post('/:id/updates', protect, async (req, res) => {
  try {
    const update = await goalService.createGoalUpdate({
      goalId: parseInt(req.params.id),
      authorId: req.user.id,
      content: req.body.content
    })

    const io = req.app.get('io')
    io.to(`workspace:${update.workspaceId}`).emit('goal:updatePosted', {
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
router.post('/:id/milestones', protect, async (req, res) => {
  try {
    const milestone = await goalService.createMilestone({
      goalId: parseInt(req.params.id),
      ...req.body
    })

    res.status(201).json({ success: true, data: milestone })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/**
 * PUT /api/goals/:id/status (real-time update)
 */
router.put('/status/:id', protect, async (req, res) => {
  try {
    const goal = await goalService.updateGoalStatus({
      id: parseInt(req.params.id),
      status: req.body.status
    })

    const io = req.app.get('io')

    io.to(`workspace:${goal.workspaceId}`).emit('goal:statusChanged', {
      goalId: goal.id,
      status: goal.status
    })

    res.json({ success: true, data: goal })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

/**
 * MILESTONES
 */
router.put('/milestones/:milestoneId', protect, async (req, res) => {
  try {
    const milestone = await goalService.updateMilestone(
      parseInt(req.params.milestoneId),
      req.body
    )

    res.json({ success: true, data: milestone })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

router.delete('/milestones/:milestoneId', protect, async (req, res) => {
  try {
    await goalService.deleteMilestone(parseInt(req.params.milestoneId))

    res.json({
      success: true,
      message: 'Milestone deleted'
    })
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
})

module.exports = router