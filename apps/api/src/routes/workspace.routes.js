const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole, requirePermission } = require('../middleware/role.middleware')

const workspaceService = require('../services/workspace.service')
const { log } = require('../services/auditLog.service')
const prisma = require('../lib/prisma')

const { sendMail } = require('../lib/mailer')
const { inviteTemplate } = require('../lib/emailTemplates')

// GET /api/workspaces
router.get('/', protect, async (req, res) => {
  try {
    const workspaces = await workspaceService.getUserWorkspaces(req.user.id)
    res.json({ success: true, data: workspaces })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// POST /api/workspaces
router.post('/', protect, async (req, res) => {
  try {
    const workspace = await workspaceService.createWorkspace({
      ...req.body,
      userId: req.user.id
    })

    res.status(201).json({ success: true, data: workspace })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// GET /api/workspaces/:id
router.get('/:id', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const workspace = await workspaceService.getWorkspaceById(parseInt(req.params.id))

    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' })
    }

    res.json({ success: true, data: workspace })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// PUT /api/workspaces/:id (Admin only)
router.put('/:id', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const workspace = await workspaceService.updateWorkspace(
      parseInt(req.params.id),
      req.body
    )

    await log({
      workspaceId: parseInt(req.params.id),
      userId: req.user.id,
      action: 'WORKSPACE_UPDATED'
    })

    res.json({ success: true, data: workspace })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/workspaces/:id (Admin only)
router.delete('/:id', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    await workspaceService.deleteWorkspace(parseInt(req.params.id))

    res.json({ success: true, message: 'Workspace deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* =========================================================
   INVITE MEMBER (ADMIN ONLY)
========================================================= */

router.post(
  '/:id/invite',
  protect,
  requirePermission('canInviteMembers'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id)

      // 1. Create invite in DB
      const member = await workspaceService.inviteMember({
        workspaceId,
        email: req.body.email
      })

      // 2. Get workspace info
      const workspace = await workspaceService.getWorkspaceById(workspaceId)

      // 3. Send email
      await sendMail({
        to: req.body.email,
        subject: `You've been invited to ${workspace.name}`,
        html: inviteTemplate({
          inviterName: req.user.name || 'Team Member',
          workspaceName: workspace.name,
          loginUrl: `${process.env.CLIENT_URL}/login`
        })
      })

      // 4. Audit log
      await log({
        workspaceId,
        userId: req.user.id,
        action: 'MEMBER_INVITED',
        metadata: { email: req.body.email }
      })

      // 5. Real-time event
      const io = req.app.get('io')
      io.to(`workspace:${workspaceId}`).emit('member:invited', {
        workspaceId,
        email: req.body.email
      })

      res.status(201).json({ success: true, data: member })
    } catch (err) {
      res.status(400).json({ success: false, message: err.message })
    }
  }
)

/* =========================================================
   MEMBER ROLE UPDATE (ADMIN ONLY)
========================================================= */

router.put(
  '/:id/members/:userId/role',
  protect,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const member = await workspaceService.updateMemberRole({
        workspaceId: parseInt(req.params.id),
        userId: parseInt(req.params.userId),
        role: req.body.role
      })

      res.json({ success: true, data: member })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/* =========================================================
   REMOVE MEMBER (ADMIN ONLY)
========================================================= */

router.delete(
  '/:id/members/:userId',
  protect,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      await workspaceService.removeMember({
        workspaceId: parseInt(req.params.id),
        userId: parseInt(req.params.userId)
      })

      res.json({ success: true, message: 'Member removed' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

module.exports = router