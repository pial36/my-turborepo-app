const prisma = require('../lib/prisma')
const { sendMail } = require('../lib/mailer')
const { mentionTemplate } = require('../lib/emailTemplates')

/* =========================================================
   CREATE ANNOUNCEMENT
========================================================= */
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

/* =========================================================
   GET ANNOUNCEMENTS
========================================================= */
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

/* =========================================================
   PIN / UNPIN
========================================================= */
const togglePin = async (announcementId, pinned) => {
  return prisma.announcement.update({
    where: { id: announcementId },
    data: { pinned }
  })
}

/* =========================================================
   DELETE ANNOUNCEMENT
========================================================= */
const deleteAnnouncement = async (announcementId) => {
  return prisma.announcement.delete({
    where: { id: announcementId }
  })
}

/* =========================================================
   REACTIONS (TOGGLE)
========================================================= */
const toggleReaction = async ({ announcementId, userId, emoji }) => {
  const existing = await prisma.reaction.findUnique({
    where: {
      announcementId_userId_emoji: {
        announcementId,
        userId,
        emoji
      }
    }
  })

  if (existing) {
    await prisma.reaction.delete({
      where: {
        announcementId_userId_emoji: {
          announcementId,
          userId,
          emoji
        }
      }
    })

    return { action: 'removed' }
  }

  await prisma.reaction.create({
    data: { announcementId, userId, emoji }
  })

  return { action: 'added' }
}

/* =========================================================
   COMMENTS + @MENTION EMAIL + NOTIFICATION
========================================================= */
const addComment = async ({ announcementId, authorId, content, workspaceName }) => {
  const comment = await prisma.comment.create({
    data: { announcementId, authorId, content },
    include: {
      author: { select: { id: true, name: true, avatar: true } }
    }
  })

  // 🔹 extract @mentions
  const mentions = content.match(/@(\w+)/g) || []

  for (const mention of mentions) {
    const name = mention.slice(1)

    const mentioned = await prisma.user.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' }
      }
    })

    if (mentioned && mentioned.id !== authorId) {
      // 🔔 in-app notification
      await prisma.notification.create({
        data: {
          userId: mentioned.id,
          type: 'MENTION',
          message: `${comment.author.name} mentioned you in a comment`
        }
      })

      // 📧 email notification
      await sendMail({
        to: mentioned.email,
        subject: `${comment.author.name} mentioned you in ${workspaceName}`,
        html: mentionTemplate({
          mentionerName: comment.author.name,
          workspaceName,
          commentContent: content,
          appUrl: process.env.CLIENT_URL
        })
      })
    }
  }

  return comment
}

/* =========================================================
   EXPORTS
========================================================= */
module.exports = {
  createAnnouncement,
  getAnnouncementsByWorkspace,
  togglePin,
  deleteAnnouncement,
  toggleReaction,
  addComment
}