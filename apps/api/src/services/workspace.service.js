const  prisma = require('../lib/prisma')

const createWorkspace = async ({ name, description, accentColor, userId }) => {
  // create workspace + add creator as ADMIN in one transaction
  return prisma.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name, description, accentColor }
    })
    await tx.workspaceMember.create({
      data: { userId, workspaceId: workspace.id, role: 'ADMIN' }
    })
    return workspace
  })
}

const getUserWorkspaces = async (userId) => {
  return prisma.workspace.findMany({
    where: {
      members: { some: { userId } }
    },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

const getWorkspaceById = async (workspaceId) => {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } }
        }
      }
    }
  })
}

const updateWorkspace = async (workspaceId, data) => {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data
  })
}

const deleteWorkspace = async (workspaceId) => {
  return prisma.$transaction(async (tx) => {
    // Delete all related records first (cascade manually due to FK constraints)
    await tx.workspaceMember.deleteMany({ where: { workspaceId } })
    await tx.auditLog.deleteMany({ where: { workspaceId } })
    await tx.reaction.deleteMany({ where: { announcement: { workspaceId } } })
    await tx.comment.deleteMany({ where: { announcement: { workspaceId } } })
    await tx.announcement.deleteMany({ where: { workspaceId } })
    await tx.actionItem.deleteMany({ where: { workspaceId } })
    await tx.milestone.deleteMany({ where: { goal: { workspaceId } } })
    await tx.goalUpdate.deleteMany({ where: { goal: { workspaceId } } })
    await tx.goal.deleteMany({ where: { workspaceId } })
    // Finally delete the workspace
    return tx.workspace.delete({ where: { id: workspaceId } })
  })
}

// invite by email — finds user then adds them
const inviteMember = async ({ workspaceId, email }) => {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) throw new Error('No user found with that email')

  const existing = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId: user.id, workspaceId } }
  })
  if (existing) throw new Error('User is already a member')

  return prisma.workspaceMember.create({
    data: { userId: user.id, workspaceId, role: 'MEMBER' },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } }
    }
  })
}

const updateMemberRole = async ({ workspaceId, userId, role }) => {
  return prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId, workspaceId } },
    data: { role }
  })
}

const updateMemberPermissions = async ({ workspaceId, userId, permissions }) => {
  return prisma.workspaceMember.update({
    where: { userId_workspaceId: { userId, workspaceId } },
    data: {
      canCreateGoals: permissions.canCreateGoals ?? undefined,
      canPostAnnouncements: permissions.canPostAnnouncements ?? undefined,
      canInviteMembers: permissions.canInviteMembers ?? undefined,
      canManageActionItems: permissions.canManageActionItems ?? undefined,
    }
  })
}

const removeMember = async ({ workspaceId, userId }) => {
  return prisma.workspaceMember.delete({
    where: { userId_workspaceId: { userId, workspaceId } }
  })
}

const getMemberRole = async ({ workspaceId, userId }) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } }
  })
  return member?.role || null
}

module.exports = {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  deleteWorkspace,
  inviteMember,
  updateMemberRole,  updateMemberPermissions,  removeMember,
  getMemberRole
}