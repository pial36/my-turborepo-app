const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── clean existing data ───────────────────────────────
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.reaction.deleteMany()
  await prisma.comment.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.actionItem.deleteMany()
  await prisma.milestone.deleteMany()
  await prisma.goalUpdate.deleteMany()
  await prisma.goal.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.user.deleteMany()

  console.log('✅ Cleaned existing data')

  // ─── create users ──────────────────────────────────────
  const hashedPassword = await bcrypt.hash('demo123456', 10)

  const admin = await prisma.user.create({
    data: {
      name: 'Demo Admin',
      email: 'admin@demo.com',
      password: hashedPassword,
      avatar: null
    }
  })

  const member1 = await prisma.user.create({
    data: {
      name: 'Jane Smith',
      email: 'jane@demo.com',
      password: hashedPassword,
      avatar: null
    }
  })

  const member2 = await prisma.user.create({
    data: {
      name: 'Bob Johnson',
      email: 'bob@demo.com',
      password: hashedPassword,
      avatar: null
    }
  })

  console.log('✅ Created users')

  // ─── create workspace ──────────────────────────────────
  const workspace = await prisma.workspace.create({
    data: {
      name: 'Demo Workspace',
      description: 'This is a demo workspace to explore all features',
      accentColor: '#6366f1'
    }
  })

  // ─── add members ───────────────────────────────────────
  await prisma.workspaceMember.createMany({
    data: [
      {
        userId: admin.id,
        workspaceId: workspace.id,
        role: 'ADMIN',
        canCreateGoals: true,
        canPostAnnouncements: true,
        canInviteMembers: true,
        canManageActionItems: true
      },
      {
        userId: member1.id,
        workspaceId: workspace.id,
        role: 'MEMBER',
        canCreateGoals: true,
        canPostAnnouncements: false,
        canInviteMembers: false,
        canManageActionItems: true
      },
      {
        userId: member2.id,
        workspaceId: workspace.id,
        role: 'MEMBER',
        canCreateGoals: true,
        canPostAnnouncements: false,
        canInviteMembers: false,
        canManageActionItems: true
      }
    ]
  })

  console.log('✅ Created workspace and members')

  // ─── create goals ──────────────────────────────────────
  const goal1 = await prisma.goal.create({
    data: {
      title: 'Launch Version 1.0',
      dueDate: new Date('2024-12-31'),
      status: 'IN_PROGRESS',
      ownerId: admin.id,
      workspaceId: workspace.id
    }
  })

  const goal2 = await prisma.goal.create({
    data: {
      title: 'Improve Team Onboarding',
      dueDate: new Date('2024-09-30'),
      status: 'NOT_STARTED',
      ownerId: member1.id,
      workspaceId: workspace.id
    }
  })

  const goal3 = await prisma.goal.create({
    data: {
      title: 'Q3 Marketing Campaign',
      dueDate: new Date('2024-08-01'),
      status: 'COMPLETED',
      ownerId: member2.id,
      workspaceId: workspace.id
    }
  })

  console.log('✅ Created goals')

  // ─── create milestones ─────────────────────────────────
  await prisma.milestone.createMany({
    data: [
      { title: 'Backend API complete',   progress: 100, goalId: goal1.id },
      { title: 'Frontend UI complete',   progress: 60,  goalId: goal1.id },
      { title: 'Testing & QA',           progress: 20,  goalId: goal1.id },
      { title: 'Write onboarding docs',  progress: 0,   goalId: goal2.id },
      { title: 'Record video tutorials', progress: 0,   goalId: goal2.id },
      { title: 'Campaign strategy',      progress: 100, goalId: goal3.id },
      { title: 'Content creation',       progress: 100, goalId: goal3.id }
    ]
  })

  console.log('✅ Created milestones')

  // ─── create goal updates (activity feed) ───────────────
  await prisma.goalUpdate.createMany({
    data: [
      {
        content: 'Backend API is fully complete! Moving to frontend now.',
        goalId: goal1.id,
        authorId: admin.id
      },
      {
        content: 'Completed authentication and workspace modules.',
        goalId: goal1.id,
        authorId: admin.id
      },
      {
        content: 'Starting the onboarding documentation this week.',
        goalId: goal2.id,
        authorId: member1.id
      },
      {
        content: 'Q3 campaign wrapped up successfully! Great team effort.',
        goalId: goal3.id,
        authorId: member2.id
      }
    ]
  })

  console.log('✅ Created goal updates')

  // ─── create action items ───────────────────────────────
  await prisma.actionItem.createMany({
    data: [
      {
        title: 'Set up CI/CD pipeline',
        priority: 'HIGH',
        status: 'DONE',
        dueDate: new Date('2024-06-30'),
        goalId: goal1.id,
        assigneeId: admin.id
      },
      {
        title: 'Design system components',
        priority: 'HIGH',
        status: 'DOING',
        dueDate: new Date('2024-07-15'),
        goalId: goal1.id,
        assigneeId: member1.id
      },
      {
        title: 'Write API documentation',
        priority: 'MEDIUM',
        status: 'DOING',
        dueDate: new Date('2024-07-20'),
        goalId: goal1.id,
        assigneeId: admin.id
      },
      {
        title: 'Set up error monitoring',
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: new Date('2024-08-01'),
        goalId: goal1.id,
        assigneeId: member2.id
      },
      {
        title: 'Create onboarding checklist',
        priority: 'HIGH',
        status: 'TODO',
        dueDate: new Date('2024-08-15'),
        goalId: goal2.id,
        assigneeId: member1.id
      },
      {
        title: 'Record welcome video',
        priority: 'LOW',
        status: 'TODO',
        dueDate: new Date('2024-09-01'),
        goalId: goal2.id,
        assigneeId: member1.id
      }
    ]
  })

  console.log('✅ Created action items')

  // ─── create announcements ──────────────────────────────
  const announcement1 = await prisma.announcement.create({
    data: {
      content: '🎉 Welcome to Team Hub! This is your collaborative workspace. Use Goals to track progress, Action Items for tasks, and Announcements to keep everyone informed.',
      pinned: true,
      workspaceId: workspace.id,
      authorId: admin.id
    }
  })

  const announcement2 = await prisma.announcement.create({
    data: {
      content: '📅 Team standup has moved to 10:00 AM starting Monday. Please update your calendars. @Jane Smith @Bob Johnson please confirm you received this.',
      pinned: false,
      workspaceId: workspace.id,
      authorId: admin.id
    }
  })

  const announcement3 = await prisma.announcement.create({
    data: {
      content: '🚀 Backend API is now deployed on Railway! You can find the API docs at /api/docs. Great work everyone!',
      pinned: false,
      workspaceId: workspace.id,
      authorId: admin.id
    }
  })

  console.log('✅ Created announcements')

  // ─── create reactions ──────────────────────────────────
  await prisma.reaction.createMany({
    data: [
      { emoji: '👍', announcementId: announcement1.id, userId: member1.id },
      { emoji: '🎉', announcementId: announcement1.id, userId: member2.id },
      { emoji: '👍', announcementId: announcement2.id, userId: member1.id },
      { emoji: '✅', announcementId: announcement2.id, userId: member2.id },
      { emoji: '🚀', announcementId: announcement3.id, userId: member1.id },
      { emoji: '🔥', announcementId: announcement3.id, userId: member2.id }
    ]
  })

  console.log('✅ Created reactions')

  // ─── create comments ───────────────────────────────────
  await prisma.comment.createMany({
    data: [
      {
        content: 'Thanks for the warm welcome! Excited to be here.',
        announcementId: announcement1.id,
        authorId: member1.id
      },
      {
        content: 'Confirmed! 10 AM works great for me.',
        announcementId: announcement2.id,
        authorId: member1.id
      },
      {
        content: 'Got it, updating my calendar now!',
        announcementId: announcement2.id,
        authorId: member2.id
      },
      {
        content: 'Amazing work on the API! The docs look great.',
        announcementId: announcement3.id,
        authorId: member1.id
      }
    ]
  })

  console.log('✅ Created comments')

  // ─── create notifications ──────────────────────────────
  await prisma.notification.createMany({
    data: [
      {
        type: 'MENTION',
        message: 'Demo Admin mentioned you in a comment',
        read: false,
        userId: member1.id
      },
      {
        type: 'MENTION',
        message: 'Demo Admin mentioned you in a comment',
        read: false,
        userId: member2.id
      }
    ]
  })

  console.log('✅ Created notifications')

  // ─── create audit logs ─────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        action: 'WORKSPACE_CREATED',
        metadata: JSON.stringify({ workspaceId: workspace.id }),
        workspaceId: workspace.id,
        userId: admin.id
      },
      {
        action: 'MEMBER_INVITED',
        metadata: JSON.stringify({ email: member1.email }),
        workspaceId: workspace.id,
        userId: admin.id
      },
      {
        action: 'MEMBER_INVITED',
        metadata: JSON.stringify({ email: member2.email }),
        workspaceId: workspace.id,
        userId: admin.id
      },
      {
        action: 'GOAL_CREATED',
        metadata: JSON.stringify({ goalId: goal1.id, title: goal1.title }),
        workspaceId: workspace.id,
        userId: admin.id
      },
      {
        action: 'GOAL_CREATED',
        metadata: JSON.stringify({ goalId: goal2.id, title: goal2.title }),
        workspaceId: workspace.id,
        userId: member1.id
      },
      {
        action: 'ANNOUNCEMENT_CREATED',
        metadata: JSON.stringify({ announcementId: announcement1.id }),
        workspaceId: workspace.id,
        userId: admin.id
      }
    ]
  })

  console.log('✅ Created audit logs')

  // ─── summary ───────────────────────────────────────────
  console.log('\n🎉 Seeding complete!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('Demo accounts:')
  console.log('  Admin  → admin@demo.com  / demo123456')
  console.log('  Member → jane@demo.com   / demo123456')
  console.log('  Member → bob@demo.com    / demo123456')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })