const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole } = require('../middleware/role.middleware')
const { getAuditLogs } = require('../services/auditLog.service')

// GET /api/audit-logs/:workspaceId
router.get('/:workspaceId', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const { action, userId, from, to } = req.query

    const logs = await getAuditLogs({
      workspaceId: parseInt(req.params.workspaceId),
      action,                          // filter by action type
      userId: userId ? parseInt(userId) : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined
    })
    res.json({ success: true, data: logs })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/audit-logs/:workspaceId/export
router.get('/:workspaceId/export', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await getAuditLogs({ workspaceId: parseInt(req.params.workspaceId) })

    const rows = logs.map(l =>
      `${l.id},${l.action},${l.user.name},${l.metadata ?? ''},${l.createdAt}`
    )
    const csv = ['ID,Action,User,Metadata,CreatedAt', ...rows].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv')
    res.send(csv)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router