const  prisma  = require('../lib/prisma')
const { toCsv } = require('../lib/csv')

// Monday 00:00 of the current week
const startOfWeek = (now = new Date()) => {
  const start = new Date(now)
  const daysSinceMonday = (now.getDay() + 6) % 7
  start.setDate(now.getDate() - daysSinceMonday)
  start.setHours(0, 0, 0, 0)
  return start
}

const getWorkspaceStats = async (workspaceId) => {
  const now = new Date()

  // run all queries in parallel for performance
  const [
    totalGoals,
    completedThisWeek,
    overdueGoals,
    overdueActionItems,
    goalsByStatus,
    totalActionItems,
    completedActionItems
  ] = await Promise.all([
    // total goals in workspace
    prisma.goal.count({ where: { workspaceId } }),

    // action items marked DONE since Monday (completedAt is set on status change)
    prisma.actionItem.count({
      where: { workspaceId, status: 'DONE', completedAt: { gte: startOfWeek(now) } }
    }),

    // overdue goals (past due date, not completed)
    prisma.goal.count({
      where: { workspaceId, dueDate: { lt: now }, status: { not: 'COMPLETED' } }
    }),

    // overdue action items (past due date, not done)
    prisma.actionItem.count({
      where: { workspaceId, dueDate: { lt: now }, status: { not: 'DONE' } }
    }),

    // goals grouped by status — for Recharts chart
    prisma.goal.groupBy({
      by: ['status'],
      where: { workspaceId },
      _count: { status: true }
    }),

    prisma.actionItem.count({ where: { workspaceId } }),

    prisma.actionItem.count({ where: { workspaceId, status: 'DONE' } })
  ])

  return {
    totalGoals,
    completedThisWeek,
    overdueCount: overdueGoals + overdueActionItems,
    overdueGoals,
    overdueActionItems,
    goalsByStatus,                   // array → feed into Recharts
    totalActionItems,
    completedActionItems
  }
}

// CSV export — goals and action items in one file, two sections
const exportWorkspaceCSV = async (workspaceId) => {
  const [goals, actionItems] = await Promise.all([
    prisma.goal.findMany({
      where: { workspaceId },
      include: {
        owner: { select: { name: true } },
        milestones: { select: { progress: true } }
      },
      orderBy: { createdAt: 'asc' }
    }),
    prisma.actionItem.findMany({
      where: { workspaceId },
      include: {
        assignee: { select: { name: true } },
        goal: { select: { title: true } }
      },
      orderBy: { createdAt: 'asc' }
    })
  ])

  const goalCSV = toCsv(
    ['ID', 'Title', 'Status', 'Owner', 'DueDate', 'Milestones', 'AvgProgress'],
    goals.map((g) => [
      g.id,
      g.title,
      g.status,
      g.owner?.name,
      g.dueDate,
      g.milestones.length,
      g.milestones.length
        ? Math.round(g.milestones.reduce((sum, m) => sum + m.progress, 0) / g.milestones.length)
        : ''
    ])
  )

  const actionCSV = toCsv(
    ['ID', 'Title', 'Status', 'Priority', 'Assignee', 'Goal', 'DueDate', 'CompletedAt'],
    actionItems.map((a) => [
      a.id,
      a.title,
      a.status,
      a.priority,
      a.assignee?.name,
      a.goal?.title,
      a.dueDate,
      a.completedAt
    ])
  )

  return { goalCSV, actionCSV }
}

module.exports = { getWorkspaceStats, exportWorkspaceCSV }
