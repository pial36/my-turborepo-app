const prisma = require('../lib/prisma')
const { sendMail } = require('../lib/mailer')
const { mentionTemplate } = require('../lib/emailTemplates')

const createAnnouncement = async ({ content, workspaceId, authorId }) => {
  return prisma.announcement.create({
    data: { content, workspaceId, authorId },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      reactions: true,
      comments: {
        include: {
          author: { select: { id: true, name: true, avatar: true } }
        }
      }
    }
  })
}

const getAnnouncementsByWorkspace = async (workspaceId) => {
  return prisma.announcement.findMany({
    where: { workspaceId },
    include: {
      author: { select: { id: true, name: true, avatar: true } },
      reactions: true,
      comments: {
        include: {
          author: { select: { id: true, name: true, avatar: true } }
        },
        orderBy: { createdAt: 'asc' }
      }
    },
    orderBy: [
      { pinned: 'desc' },
      { createdAt: 'desc' }
    ]
  })
}

const togglePin = async (announcementId, pinned) => {
  return prisma.announcement.update({
    where: { id: announcementId },
    data: { pinned }
  })
}

const deleteAnnouncement = async (announcementId) => {
  return prisma.announcement.delete({
    where: { id: announcementId }
  })
}

const toggleReaction = async ({ announcementId, userId, emoji }) => {
  const existing = await prisma.reaction.findUnique({
    where: {
      announcementId_userId_emoji: { announcementId, userId, emoji }
    }
  })

  if (existing) {
    await prisma.reaction.delete({
      where: {
        announcementId_userId_emoji: { announcementId, userId, emoji }
      }
    })
    return { action: 'removed' }
  }

  await prisma.reaction.create({
    data: { announcementId, userId, emoji }
  })
  return { action: 'added' }
}

/*
  HOW @MENTION MATCHING WORKS:
  - User types @RaiyaChowdhury in the comment box (frontend strips spaces)
  - The regex extracts "RaiyaChowdhury" from @RaiyaChowdhury
  - We fetch ALL workspace members and compare:
      "Raiya Chowdhury".replace(/\s+/g,'').toLowerCase()
      === "raiyachowdhury"
      === "RaiyaChowdhury".toLowerCase()
  - This way spaces in real names are handled correctly
*/
const addComment = async ({ announcementId, authorId, content, workspaceName }) => {
  const comment = await prisma.comment.create({
    data: { announcementId, authorId, content },
    include: {
      author: { select: { id: true, name: true, avatar: true } }
    }
  })

  const mentions = content.match(/@(\w+)/g) || []
  const mentionedNotifications = []

  if (mentions.length > 0) {
    // Fetch all users ONCE — avoid N+1 and avoid exact-name matching failure
    const allUsers = await prisma.user.findMany({
      select: { id: true, name: true, email: true }
    })

    for (const mention of mentions) {
      const handle = mention.slice(1).toLowerCase() // "RaiyaChowdhury" -> "raiyachowdhury"

      // KEY FIX: strip spaces from DB name before comparing
      // "Raiya Chowdhury" -> "raiyachowdhury" === "raiyachowdhury" ✅
      const mentioned = allUsers.find(u =>
        u.name.replace(/\s+/g, '').toLowerCase() === handle
      )

      if (mentioned && mentioned.id !== authorId) {
        // Save notification to DB
        const notification = await prisma.notification.create({
          data: {
            userId: mentioned.id,
            type: 'MENTION',
            message: `${comment.author.name} mentioned you in a comment`
          }
        })
        mentionedNotifications.push(notification)

        // Email (non-blocking)
        try {
          await sendMail({
            to: mentioned.email,
            subject: `${comment.author.name} mentioned you in ${workspaceName || 'your workspace'}`,
            html: mentionTemplate({
              mentionerName: comment.author.name,
              workspaceName: workspaceName || 'your workspace',
              commentContent: content,
              appUrl: process.env.CLIENT_URL
            })
          })
        } catch (emailErr) {
          console.warn(`Email failed for @mention to ${mentioned.email}:`, emailErr.message)
        }
      }
    }
  }

  return { comment, mentionedNotifications }
}

module.exports = {
  createAnnouncement,
  getAnnouncementsByWorkspace,
  togglePin,
  deleteAnnouncement,
  toggleReaction,
  addComment
}