const  prisma  = require('../lib/prisma')

const createActionItem = async ({ title, goalId, assigneeId, priority, dueDate, status = 'TODO' }) => {
  return prisma.actionItem.create({
    data: { title, goalId, assigneeId, priority, dueDate, status },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      goal: { select: { id: true, title: true } }
    }
  })
}

const getActionItemsByWorkspace = async (workspaceId) => {
  return prisma.actionItem.findMany({
    where: {
      goal: { workspaceId }        // filter through goal relation
    },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
      goal: { select: { id: true, title: true } }
    },
    orderBy: { createdAt: 'desc' }
  })
}

const getActionItemsByGoal = async (goalId) => {
  return prisma.actionItem.findMany({
    where: { goalId },
    include: {
      assignee: { select: { id: true, name: true, avatar: true } }
    }
  })
}

const updateActionItem = async (actionItemId, data) => {
  return prisma.actionItem.update({
    where: { id: actionItemId },
    data,
    include: {
      assignee: { select: { id: true, name: true, avatar: true } },
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
  deleteActionItem
}