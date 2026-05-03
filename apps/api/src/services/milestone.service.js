const  prisma  = require('../lib/prisma')

const createMilestone = async (data) => {
  return prisma.milestone.create({ data })
}

const getMilestonesByGoal = async (goalId) => {
  return prisma.milestone.findMany({
    where: { goalId }
  })
}

const updateMilestoneStatus = async (milestoneId, status) => {
  return prisma.milestone.update({
    where: { id: milestoneId },
    data: { status }
  })
}

module.exports = {
  createMilestone,
  getMilestonesByGoal,
  updateMilestoneStatus
}