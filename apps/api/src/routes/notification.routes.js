const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const notificationService = require('../services/notification.service')

// GET /api/notifications
router.get('/', protect, async (req, res) => {
  try {
    const notifications = await notificationService.getUserNotifications(req.user.id)
    res.json({ success: true, data: notifications })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/notifications/:id/read
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notification = await notificationService.markAsRead(parseInt(req.params.id))
    res.json({ success: true, data: notification })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/notifications/read-all
router.put('/read-all', protect, async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id)
    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/notifications/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    await notificationService.deleteNotification(parseInt(req.params.id))
    res.json({ success: true, message: 'Notification deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router