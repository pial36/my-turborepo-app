const  prisma  = require('../lib/prisma')

const createGoal = async ({ title, ownerId, dueDate, status = 'NOT_STARTED', workspaceId }) => {
  return prisma.goal.create({
    data: { title, ownerId, dueDate, status, workspaceId },
    include: {
      owner: { select: { id: true, name: true, avatar: true } }
    }
  })
}

const getGoalsByWorkspace = async (workspaceId) => {
  return prisma.goal.findMany({
    where: { workspaceId },
    include: {
      owner: { select: { id: true, name: true, avatar: true } },
      milestones: true,
      actionItems: {
        include: {
          assignee: { select: { id: true, name: true, avatar: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })
}

const getGoalById = async (goalId) => {
  return prisma.goal.findUnique({
    where: { id: goalId },
    include: {
      owner: { select: { id: true, name: true, avatar: true } },
      milestones: true,
      actionItems: {
        include: {
          assignee: { select: { id: true, name: true, avatar: true } }
        }
      },
      updates: {
        include: {
          author: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })
}

const updateGoal = async (goalId, data) => {
  return prisma.goal.update({
    where: { id: goalId },
    data
  })
}

const deleteGoal = async (goalId) => {
  return prisma.goal.delete({ where: { id: goalId } })
}

// Activity feed
const createGoalUpdate = async ({ goalId, authorId, content }) => {
  return prisma.goalUpdate.create({
    data: { goalId, authorId, content },
    include: {
      author: { select: { id: true, name: true, avatar: true } }
    }
  })
}

const createMilestone = async ({ goalId, title, progress = 0 }) => {
  return prisma.milestone.create({
    data: { title, progress, goalId }
  })
}

const updateMilestone = async (milestoneId, data) => {
  return prisma.milestone.update({
    where: { id: milestoneId },
    data
  })
}

const deleteMilestone = async (milestoneId) => {
  return prisma.milestone.delete({
    where: { id: milestoneId }
  })
}

const getAllGoals = async () => {
  return prisma.goal.findMany()
}

module.exports = {
  createGoal,
  getGoalsByWorkspace,
  getGoalById,
  getAllGoals,
  updateGoal,
  deleteGoal,
  createGoalUpdate,
  createMilestone,
  updateMilestone,
  deleteMilestone,
}