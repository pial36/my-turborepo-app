const  prisma  = require('../lib/prisma')

const getWorkspaceStats = async (workspaceId) => {
  const now = new Date()
  const startOfWeek = new Date()
  startOfWeek.setDate(now.getDate() - now.getDay())  // Sunday
  startOfWeek.setHours(0, 0, 0, 0)

  // run all queries in parallel for performance
  const [
    totalGoals,
    completedThisWeek,
    overdueCount,
    goalsByStatus,
    totalActionItems,
    completedActionItems
  ] = await Promise.all([
    // total goals in workspace
    prisma.goal.count({ where: { workspaceId } }),

    // action items completed this week
    prisma.actionItem.count({
      where: {
        goal: { workspaceId },
        status: 'DONE',
        createdAt: { gte: startOfWeek }
      }
    }),

    // overdue goals (past due date, not completed)
    prisma.goal.count({
      where: {
        workspaceId,
        dueDate: { lt: now },
        status: { not: 'COMPLETED' }
      }
    }),

    // goals grouped by status — for Recharts chart
    prisma.goal.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { status: true }
    }),

    // total action items
    prisma.actionItem.count({
      where: { goal: { workspaceId } }
    }),

    // completed action items
    prisma.actionItem.count({
      where: { goal: { workspaceId }, status: 'DONE' }
    })
  ])

  return {
    totalGoals,
    completedThisWeek,
    overdueCount,
    goalsByStatus,                   // array → feed into Recharts
    totalActionItems,
    completedActionItems
  }
}

// CSV export — workspace data
const exportWorkspaceCSV = async (workspaceId) => {
  const [goals, actionItems] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId },
      include: {
        owner: { select: { name: true } },
        milestones: true
      }
    }),
    prisma.actionItem.findMany({
      where: { goal: { workspaceId } },
      include: {
        assignee: { select: { name: true } },
        goal: { select: { title: true } }
      }
    })
  ])

  // format as CSV rows
  const goalRows = goals.map(g =>
    `${g.id},${g.title},${g.status},${g.owner.name},${g.dueDate ?? ''},${g.milestones.length}`
  )

  const actionRows = actionItems.map(a =>
    `${a.id},${a.title},${a.status},${a.priority},${a.assignee.name},${a.goal.title},${a.dueDate ?? ''}`
  )

  const goalCSV = ['ID,Title,Status,Owner,DueDate,Milestones', ...goalRows].join('\n')
  const actionCSV = ['ID,Title,Status,Priority,Assignee,Goal,DueDate', ...actionRows].join('\n')

  return { goalCSV, actionCSV }
}

module.exports = { getWorkspaceStats, exportWorkspaceCSV }