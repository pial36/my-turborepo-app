const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole, requirePermission } = require('../middleware/role.middleware')
const announcementService = require('../services/announcement.service')
const { log } = require('../services/auditLog.service')
const { uploadAttachment } = require('../lib/multer')          
const { uploadToCloudinary } = require('../lib/cloudinaryUpload')

// GET /api/announcements/workspace/:workspaceId
router.get('/workspace/:workspaceId', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const announcements = await announcementService.getAnnouncementsByWorkspace(
      parseInt(req.params.workspaceId)   // ✅ matches :workspaceId
    )
    res.json({ success: true, data: announcements })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

 // ✅ permission-based
router.post(
  '/workspace/:workspaceId',
  protect,
  requirePermission('canPostAnnouncements'), 
  async (req, res) => {
    try {
      const announcement = await announcementService.createAnnouncement({
        content: req.body.content,
        workspaceId: parseInt(req.params.workspaceId),
        authorId: req.user.id
      })

      await log({
        workspaceId: parseInt(req.params.workspaceId),
        userId: req.user.id,
        action: 'ANNOUNCEMENT_CREATED'
      })

      // emit to workspace room
      const io = req.app.get('io')
      io.to(`workspace:${req.params.workspaceId}`).emit('announcement:new', announcement)

      res.status(201).json({ success: true, data: announcement })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

// PUT /api/announcements/:id/pin — workspace members only
router.put('/:id/pin', protect, async (req, res) => {
  try {
    const announcement = await announcementService.togglePin(
      parseInt(req.params.id),
      req.body.pinned
    )
    res.json({ success: true, data: announcement })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/:id/reactions
router.post('/:id/reactions', protect, async (req, res) => {
  try {
    const result = await announcementService.toggleReaction({
      announcementId: parseInt(req.params.id),
      userId: req.user.id,
      emoji: req.body.emoji                      // ✅ fixed: emoji not type
    })

    const io = req.app.get('io')
    io.to(`workspace:${req.body.workspaceId}`).emit('reaction:updated', {
      announcementId: parseInt(req.params.id),
      action: result.action,
      emoji: req.body.emoji,
      userId: req.user.id
    })

    res.json({ success: true, data: result })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const comment = await announcementService.addComment({
      announcementId: parseInt(req.params.id),
      authorId: req.user.id,                     // ✅ fixed: authorId not userId
      content: req.body.content                  // ✅ fixed: content not text
    })

    const io = req.app.get('io')
    io.to(`workspace:${req.body.workspaceId}`).emit('comment:new', {
      announcementId: parseInt(req.params.id),
      comment
    })

    res.status(201).json({ success: true, data: comment })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/announcements/:id — Admin only
router.delete('/:id', protect, async (req, res) => {
  try {
    await announcementService.deleteAnnouncement(parseInt(req.params.id))

      await log({
      workspaceId: req.body.workspaceId,
      userId: req.user.id,
      action: 'ANNOUNCEMENT_DELETED',
      metadata: { announcementId: parseInt(req.params.id) }
    })


    res.json({ success: true, message: 'Announcement deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/announcements/upload — file attachment
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