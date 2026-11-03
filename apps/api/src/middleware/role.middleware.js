
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

// 🔹 helper: get workspace member for announcement routes (where :id is announcement ID)
const getMemberForAnnouncement = async (req) => {
  const announcementId = parseInt(req.params.id)
  const userId = req.user.id

  if (!announcementId || !userId) return null

  // First get the announcement to find its workspace
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: { workspaceId: true }
  })

  if (!announcement) return null

  // Now get the member for that workspace
  return prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId: announcement.workspaceId
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

// 🔹 role-based access for announcement routes (where :id is announcement ID)
const requireRoleForAnnouncement = (role) => async (req, res, next) => {
  try {
    const member = await getMemberForAnnouncement(req)

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

// 🔹 check if user can edit/delete action item (admin or creator only)
const requireActionItemOwnerOrAdmin = async (req, res, next) => {
  try {
    const actionItemId = parseInt(req.params.id)
    const userId = req.user.id

    if (!actionItemId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action item ID'
      })
    }

    // Get the action item
    const actionItem = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      select: { createdById: true, workspaceId: true }
    })

    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: 'Action item not found'
      })
    }

    // Get user's role in workspace
    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: {
          userId,
          workspaceId: actionItem.workspaceId
        }
      }
    })

    if (!member) {
      return res.status(403).json({
        success: false,
        message: 'Not a member of this workspace'
      })
    }

    // Allow if admin OR if user is the creator
    if (member.role !== 'ADMIN' && actionItem.createdById !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit/delete action items you created, or you must be an admin'
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
  requireRoleForAnnouncement,
  requirePermission,
  requireActionItemOwnerOrAdmin
}