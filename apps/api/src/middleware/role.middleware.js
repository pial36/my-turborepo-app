
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

// 🔹 resource id → { workspaceId, ...ownership fields }
// lets routes keyed by a resource id (/goals/:id) check workspace membership
const resourceLookups = {
  goal: (id) => prisma.goal.findUnique({
    where: { id },
    select: { workspaceId: true, ownerId: true }
  }),
  milestone: async (id) => {
    const m = await prisma.milestone.findUnique({
      where: { id },
      select: { goal: { select: { workspaceId: true, ownerId: true } } }
    })
    return m && m.goal
  },
  announcement: (id) => prisma.announcement.findUnique({
    where: { id },
    select: { workspaceId: true, authorId: true }
  }),
  actionItem: (id) => prisma.actionItem.findUnique({
    where: { id },
    select: { workspaceId: true, createdById: true, assigneeId: true }
  })
}

// 🔹 caller must be a member of the workspace that owns the resource
// sets req.resource, req.workspaceId, req.userRole, req.permissions
const requireResourceMember = (kind, param = 'id') => async (req, res, next) => {
  try {
    const id = parseInt(req.params[param])
    if (!id) {
      return res.status(400).json({ success: false, message: 'Invalid id' })
    }

    const resource = await resourceLookups[kind](id)
    if (!resource) {
      return res.status(404).json({ success: false, message: 'Not found' })
    }

    const member = await prisma.workspaceMember.findUnique({
      where: {
        userId_workspaceId: { userId: req.user.id, workspaceId: resource.workspaceId }
      }
    })
    if (!member) {
      return res.status(403).json({ success: false, message: 'Not a member of this workspace' })
    }

    req.resource = resource
    req.workspaceId = resource.workspaceId
    req.userRole = member.role
    req.permissions = member
    next()
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// 🔹 true if userId belongs to the workspace (used to validate owner/assignee ids)
const isWorkspaceMember = async (workspaceId, userId) => {
  if (!userId) return false
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { id: true }
  })
  return !!member
}

module.exports = {
  requireRole,
  requirePermission,
  requireResourceMember,
  isWorkspaceMember
}