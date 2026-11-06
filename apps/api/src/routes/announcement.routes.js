const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const {
  requireRole,
  requirePermission,
  requireResourceMember
} = require('../middleware/role.middleware')
const announcementService = require('../services/announcement.service')
const { log } = require('../services/auditLog.service')
const { uploadAttachment } = require('../lib/multer')
const { uploadToCloudinary } = require('../lib/cloudinaryUpload')
const { sanitizeRichText, isEmptyRichText } = require('../lib/sanitize')
const prisma = require('../lib/prisma')
const { REACTION_EMOJI } = require('@teamhub/shared')


// GET /api/announcements/workspace/:workspaceId
router.get('/workspace/:workspaceId', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const announcements = await announcementService.getAnnouncementsByWorkspace(
      parseInt(req.params.workspaceId)
    )
    res.json({ success: true, data: announcements })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/workspace/:workspaceId
// content is rich-text HTML from the editor; sanitized before it is stored
router.post(
  '/workspace/:workspaceId',
  protect,
  requirePermission('canPostAnnouncements'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.workspaceId)
      const content = sanitizeRichText(req.body?.content)
      if (isEmptyRichText(content)) {
        return res.status(400).json({ success: false, message: 'Content is required' })
      }

      const announcement = await announcementService.createAnnouncement({
        content,
        workspaceId,
        authorId: req.user.id
      })

      await log({
        workspaceId,
        userId: req.user.id,
        action: 'ANNOUNCEMENT_CREATED',
        metadata: { announcementId: announcement.id }
      })

      req.app.get('io').to(`workspace:${workspaceId}`).emit('announcement:new', announcement)

      res.status(201).json({ success: true, data: announcement })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

// PUT /api/announcements/:id/pin (admin only)
router.put('/:id/pin', protect, requireResourceMember('announcement'), async (req, res) => {
  try {
    if (req.userRole !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin access required' })
    }

    const announcement = await announcementService.togglePin(
      parseInt(req.params.id),
      !!req.body?.pinned
    )

    await log({
      workspaceId: req.workspaceId,
      userId: req.user.id,
      action: announcement.pinned ? 'ANNOUNCEMENT_PINNED' : 'ANNOUNCEMENT_UNPINNED',
      metadata: { announcementId: announcement.id }
    })

    req.app.get('io').to(`workspace:${req.workspaceId}`).emit('announcement:pinned', {
      announcementId: announcement.id,
      pinned: announcement.pinned
    })

    res.json({ success: true, data: announcement })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/:id/reactions
router.post('/:id/reactions', protect, requireResourceMember('announcement'), async (req, res) => {
  try {
    const emoji = req.body?.emoji
    if (!REACTION_EMOJI.includes(emoji)) {
      return res.status(400).json({ success: false, message: 'Unsupported emoji' })
    }

    const result = await announcementService.toggleReaction({
      announcementId: parseInt(req.params.id),
      userId: req.user.id,
      emoji
    })

    req.app.get('io').to(`workspace:${req.workspaceId}`).emit('reaction:updated', {
      announcementId: parseInt(req.params.id),
      action: result.action,
      emoji,
      userId: req.user.id
    })

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/:id/comments
router.post('/:id/comments', protect, requireResourceMember('announcement'), async (req, res) => {
  try {
    const announcementId = parseInt(req.params.id)
    const content = String(req.body?.content || '').trim()
    if (!content) return res.status(400).json({ success: false, message: 'Content is required' })

    const workspace = await prisma.workspace.findUnique({
      where: { id: req.workspaceId },
      select: { name: true }
    })

    const { comment, mentionedNotifications } = await announcementService.addComment({
      announcementId,
      workspaceId: req.workspaceId,
      authorId: req.user.id,
      content,
      workspaceName: workspace?.name
    })

    const io = req.app.get('io')

    io.to(`workspace:${req.workspaceId}`).emit('comment:new', {
      announcementId,
      comment
    })

    for (const notification of mentionedNotifications) {
      io.to(`user:${notification.userId}`).emit('notification:new', {
        id: notification.id,
        type: notification.type,
        message: notification.message,
        createdAt: notification.createdAt,
        read: notification.read
      })
    }

    res.status(201).json({ success: true, data: comment })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/announcements/:id (author or admin)
router.delete('/:id', protect, requireResourceMember('announcement'), async (req, res) => {
  try {
    if (req.userRole !== 'ADMIN' && req.resource.authorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the author or an admin can delete this announcement'
      })
    }

    const announcementId = parseInt(req.params.id)
    await announcementService.deleteAnnouncement(announcementId)

    await log({
      workspaceId: req.workspaceId,
      userId: req.user.id,
      action: 'ANNOUNCEMENT_DELETED',
      metadata: { announcementId }
    })

    req.app.get('io').to(`workspace:${req.workspaceId}`).emit('announcement:deleted', {
      announcementId
    })

    res.json({ success: true, message: 'Announcement deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/upload
router.post('/upload', protect, uploadAttachment.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' })
    }

    const isImage = req.file.mimetype.startsWith('image/')

    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'team-hub/attachments',
      resource_type: isImage ? 'image' : 'raw',
      ...(isImage && {
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' }
        ]
      })
    })

    res.status(201).json({
      success: true,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        type: isImage ? 'image' : 'file',
        originalName: req.file.originalname,
        size: req.file.size
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
