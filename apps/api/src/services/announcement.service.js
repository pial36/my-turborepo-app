const prisma = require('../lib/prisma')
const { sendMail } = require('../lib/mailer')
const { mentionTemplate } = require('../lib/emailTemplates')
const { sanitizeRichText } = require('../lib/sanitize')

const createAnnouncement = async ({ content, workspaceId, authorId }) => {
  return prisma.announcement.create({
    data: { content: sanitizeRichText(content), workspaceId, authorId },
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
  - User types @JaneSmith in the comment box (frontend strips spaces from names)
  - The regex extracts "JaneSmith"
  - It is compared against members of THIS workspace with spaces removed:
      "Jane Smith" -> "janesmith" === "janesmith"
*/
const addComment = async ({ announcementId, workspaceId, authorId, content, workspaceName }) => {
  const comment = await prisma.comment.create({
    data: { announcementId, authorId, content },
    include: {
      author: { select: { id: true, name: true, avatar: true } }
    }
  })

  const handles = [...new Set((content.match(/@(\w+)/g) || []).map(m => m.slice(1).toLowerCase()))]
  if (handles.length === 0) return { comment, mentionedNotifications: [] }

  // only members of this workspace can be mentioned
  const members = await prisma.workspaceMember.findMany({
    where: { workspaceId },
    select: { user: { select: { id: true, name: true, email: true } } }
  })

  const mentioned = members
    .map(m => m.user)
    .filter(u => u.id !== authorId && handles.includes(u.name.replace(/\s+/g, '').toLowerCase()))

  const mentionedNotifications = await Promise.all(mentioned.map(user =>
    prisma.notification.create({
      data: {
        userId: user.id,
        type: 'MENTION',
        message: `${comment.author.name} mentioned you in a comment`
      }
    })
  ))

  // emails are fire-and-forget so a slow SMTP server never delays the response
  for (const user of mentioned) {
    sendMail({
      to: user.email,
      subject: `${comment.author.name} mentioned you in ${workspaceName || 'your workspace'}`,
      html: mentionTemplate({
        mentionerName: comment.author.name,
        workspaceName: workspaceName || 'your workspace',
        commentContent: content,
        appUrl: process.env.CLIENT_URL
      })
    }).catch(err => console.warn(`Mention email to ${user.email} failed:`, err.message))
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