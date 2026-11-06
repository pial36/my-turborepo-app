const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole } = require('../middleware/role.middleware')
const { getAuditLogs } = require('../services/auditLog.service')
const { toCsv } = require('../lib/csv')

// shared by list + export so the CSV matches the filtered timeline
const filtersFrom = (req) => {
  const { action, userId, from, to } = req.query
  return {
    workspaceId: parseInt(req.params.workspaceId),
    action: action || undefined,
    userId: userId ? parseInt(userId) : undefined,
    from: from ? new Date(from) : undefined,
    // a bare date means 'through the end of that day'
    to: to ? new Date(/T/.test(to) ? to : to + 'T23:59:59.999') : undefined
  }
}

// GET /api/audit-logs/:workspaceId
router.get('/:workspaceId', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await getAuditLogs(filtersFrom(req))
    res.json({ success: true, data: logs })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/audit-logs/:workspaceId/export
router.get('/:workspaceId/export', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const logs = await getAuditLogs(filtersFrom(req))

    const csv = toCsv(
      ['ID', 'Action', 'User', 'Metadata', 'CreatedAt'],
      logs.map((l) => [l.id, l.action, l.user?.name, l.metadata, l.createdAt])
    )

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv')
    res.send(csv)
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router