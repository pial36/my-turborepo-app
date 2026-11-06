const  prisma  = require('../lib/prisma')

// completedAt drives the 'completed this week' stat
const completedAtFor = (status) => (status === 'DONE' ? new Date() : null)

const createActionItem = async ({ title, goalId, assigneeId, priority, dueDate, status = 'TODO', workspaceId, createdById }) => {
  return prisma.actionItem.create({
    data: { title, goalId, assigneeId, priority, dueDate, status, workspaceId, createdById, completedAt: completedAtFor(status) },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true, avatar: true } },
      goal: { select: { id: true, title: true } }
    }
  })
}

const getActionItemsByWorkspace = async (workspaceId) => {
  return prisma.actionItem.findMany({
    where: { workspaceId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true, avatar: true } },
      goal: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

const getActionItemsByGoal = async (goalId) => {
  return prisma.actionItem.findMany({
    where: { goalId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true, avatar: true } }
    }
  })
}

const updateActionItem = async (actionItemId, data) => {
  if (data.status !== undefined) {
    const current = await prisma.actionItem.findUnique({
      where: { id: actionItemId },
      select: { status: true }
    })
    if (current && current.status !== data.status) {
      data = { ...data, completedAt: completedAtFor(data.status) }
    }
  }

  return prisma.actionItem.update({
    where: { id: actionItemId },
    data,
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true, avatar: true } },
      goal: { select: { id: true, title: true } }
    }
  })
}

const getActionItemById = async (actionItemId) => {
  return prisma.actionItem.findUnique({
    where: { id: actionItemId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      creator: { select: { id: true, name: true, avatar: true } },
      goal: { select: { id: true, title: true } }
    }
  })
}

const deleteActionItem = async (actionItemId) => {
  return prisma.actionItem.delete({ where: { id: actionItemId } })
}

module.exports = {
  createActionItem,
  getActionItemsByWorkspace,
  getActionItemsByGoal,
  updateActionItem,
  getActionItemById,
  deleteActionItem
}