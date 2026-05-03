const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole } = require('../middleware/role.middleware')
const analyticsService = require('../services/analytics.service')

// GET /api/workspaces/:workspaceId
router.get('/:workspaceId', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const stats = await analyticsService.getWorkspaceStats(parseInt(req.params.workspaceId))
    res.json({ success: true, data: stats })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/workspaces/:workspaceId/export
router.get('/:workspaceId/export', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const { goalCSV, actionCSV } = await analyticsService.exportWorkspaceCSV(
      parseInt(req.params.workspaceId)
    )
    // send both as one response — frontend handles splitting
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=workspace-export.csv')
    res.send(`GOALS\n${goalCSV}\n\nACTION ITEMS\n${actionCSV}`)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router