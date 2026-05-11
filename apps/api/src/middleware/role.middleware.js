
// middleware/role.middleware.js

const prisma = require('../lib/prisma')

// 🔹 helper: get workspace member
const getMember = async (req) => {
  const workspaceId = parseInt(req.params.workspaceId || req.params.id)
  const userId = req.user.id

  if (!workspaceId || !userId) return null

  return prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId
      }
    }
  })
}

// 🔹 role-based access (ADMIN / MEMBER)
const requireRole = (role) => async (req, res, next) => {
  try {
    const member = await getMember(req)

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Not a member of this workspace'
      })
    }

    if (role === 'ADMIN' && member.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      })
    }

    // attach useful data to request
    req.userRole = member.role
    req.permissions = member

    next()
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

// 🔹 fine-grained permission check
const requirePermission = (permission) => async (req, res, next) => {
  try {
    const member = await getMember(req)

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Not a member of this workspace'
      })
    }

    // ADMIN bypass
    if (member.role === 'ADMIN') {
      req.userRole = member.role
      req.permissions = member
      return next()
    }

    // check permission field (e.g. canEditGoals)
    if (!member[permission]) {
      return res.status(403).json({
        success: false,
        message: `You don't have permission to perform this action`
      })
    }

    req.userRole = member.role
    req.permissions = member

    next()
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    })
  }
}

module.exports = {
  requireRole,
  requirePermission
}