const  prisma  = require('../lib/prisma')

// call this from other services after important actions
const log = async ({ workspaceId, userId, action, metadata }) => {
  return prisma.auditLog.create({
    data: {
      workspaceId,
      userId,
      action,
      metadata: metadata ? JSON.stringify(metadata) : null
    }
  })
}

const getAuditLogs = async ({ workspaceId, action, userId, from, to }) => {
  return prisma.auditLog.findMany({
    where: {
      workspaceId,
      ...(action && { action }),
      ...(userId && { userId }),
      ...(from || to) && {
        createdAt: {
          ...(from && { gte: from }),
          ...(to && { lte: to })
        }
      }
    },
    include: {
      user: { select: { id: true, name: true, avatar: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

module.exports = { log, getAuditLogs }