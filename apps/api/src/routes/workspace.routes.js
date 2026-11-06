const router = require('express').Router()
const { protect } = require('../middleware/auth.middleware')
const { requireRole, requirePermission } = require('../middleware/role.middleware')

const workspaceService = require('../services/workspace.service')
const { log } = require('../services/auditLog.service')
const prisma = require('../lib/prisma')
const pick = require('../lib/pick')
const { ROLES, PERMISSIONS } = require('@teamhub/shared')

const { sendMail } = require('../lib/mailer')
const { inviteTemplate } = require('../lib/emailTemplates')

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// validate name/description/accentColor; returns { data } or { error }
const parseWorkspaceBody = (body, { requireName }) => {
  const data = pick(body, ['name', 'description', 'accentColor'])

  if (data.name !== undefined) data.name = String(data.name).trim()
  if ((requireName || data.name !== undefined) && !data.name) {
    return { error: 'Name is required' }
  }
  if (data.accentColor && !HEX_COLOR.test(data.accentColor)) {
    return { error: 'Accent colour must be a hex value like #6366f1' }
  }
  return { data }
}

// stops a workspace from ending up with no admin
const wouldRemoveLastAdmin = async (workspaceId, userId) => {
  const member = await prisma.workspaceMember.findUnique({
    where: { userId_workspaceId: { userId, workspaceId } },
    select: { role: true }
  })
  if (!member) return { notFound: true }
  if (member.role !== 'ADMIN') return { lastAdmin: false }
  return { lastAdmin: (await workspaceService.countAdmins(workspaceId)) <= 1 }
}

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
    const { data, error } = parseWorkspaceBody(req.body, { requireName: true })
    if (error) return res.status(400).json({ success: false, message: error })

    const workspace = await workspaceService.createWorkspace({
      ...data,
      userId: req.user.id
    })

    await log({
      workspaceId: workspace.id,
      userId: req.user.id,
      action: 'WORKSPACE_CREATED',
      metadata: { name: workspace.name }
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
    const { data, error } = parseWorkspaceBody(req.body, { requireName: false })
    if (error) return res.status(400).json({ success: false, message: error })

    const workspace = await workspaceService.updateWorkspace(parseInt(req.params.id), data)

    await log({
      workspaceId: workspace.id,
      userId: req.user.id,
      action: 'WORKSPACE_UPDATED',
      metadata: { fields: Object.keys(data) }
    })

    req.app.get('io').to(`workspace:${workspace.id}`).emit('workspace:updated', workspace)

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
   INVITE MEMBER (canInviteMembers permission)
   Existing users are added immediately; unknown emails get a
   pending invite that is accepted when they register.
========================================================= */

router.post(
  '/:id/invite',
  protect,
  requirePermission('canInviteMembers'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id)
      const email = String(req.body?.email || '').trim().toLowerCase()
      if (!EMAIL.test(email)) {
        return res.status(400).json({ success: false, message: 'A valid email is required' })
      }

      const { member, invite } = await workspaceService.inviteMember({
        workspaceId,
        email,
        invitedById: req.user.id
      })

      const workspace = await workspaceService.getWorkspaceById(workspaceId)
      const inviter = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { name: true }
      })

      // fire-and-forget: a mail outage must not fail the invite
      sendMail({
        to: email,
        subject: `You've been invited to ${workspace.name}`,
        html: inviteTemplate({
          inviterName: inviter?.name || 'A teammate',
          workspaceName: workspace.name,
          loginUrl: `${process.env.CLIENT_URL}/${member ? 'login' : 'register'}`
        })
      }).catch((mailErr) => console.warn('Invite email failed to send:', mailErr.message))

      await log({
        workspaceId,
        userId: req.user.id,
        action: member ? 'MEMBER_INVITED' : 'INVITE_SENT',
        metadata: { email }
      })

      if (member) {
        req.app.get('io').to(`workspace:${workspaceId}`).emit('member:invited', {
          workspaceId,
          email,
          member
        })
      }

      res.status(201).json({
        success: true,
        data: member || invite,
        pending: !member,
        message: member
          ? `${email} was added to the workspace`
          : `Invite sent — ${email} will join when they sign up`
      })
    } catch (err) {
      res.status(400).json({ success: false, message: err.message })
    }
  }
)

// GET /api/workspaces/:id/invites — pending invites (Admin only)
router.get('/:id/invites', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const invites = await workspaceService.getPendingInvites(parseInt(req.params.id))
    res.json({ success: true, data: invites })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

// DELETE /api/workspaces/:id/invites/:inviteId (Admin only)
router.delete('/:id/invites/:inviteId', protect, requireRole('ADMIN'), async (req, res) => {
  try {
    const found = await workspaceService.cancelInvite({
      workspaceId: parseInt(req.params.id),
      inviteId: parseInt(req.params.inviteId)
    })
    if (!found) return res.status(404).json({ success: false, message: 'Invite not found' })
    res.json({ success: true, message: 'Invite cancelled' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

/* =========================================================
   MEMBER ROLE UPDATE (ADMIN ONLY)
========================================================= */

router.put(
  '/:id/members/:userId/role',
  protect,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id)
      const userId = parseInt(req.params.userId)
      const role = req.body?.role

      if (!ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: 'Role must be ADMIN or MEMBER' })
      }

      const check = await wouldRemoveLastAdmin(workspaceId, userId)
      if (check.notFound) return res.status(404).json({ success: false, message: 'Member not found' })
      if (role === 'MEMBER' && check.lastAdmin) {
        return res.status(400).json({ success: false, message: 'A workspace needs at least one admin' })
      }

      const member = await workspaceService.updateMemberRole({ workspaceId, userId, role })

      await log({
        workspaceId,
        userId: req.user.id,
        action: 'MEMBER_ROLE_CHANGED',
        metadata: { targetUserId: userId, role }
      })

      res.json({ success: true, data: member })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/* =========================================================
   MEMBER PERMISSIONS UPDATE (ADMIN ONLY)
========================================================= */

router.put(
  '/:id/members/:userId/permissions',
  protect,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const workspaceId = parseInt(req.params.id)
      const userId = parseInt(req.params.userId)

      // coerce to booleans; the service ignores anything else
      const permissions = {}
      for (const [key, value] of Object.entries(pick(req.body, PERMISSIONS.map((p) => p.key)))) {
        permissions[key] = value === true
      }

      const member = await workspaceService.updateMemberPermissions({
        workspaceId,
        userId,
        permissions
      })

      await log({
        workspaceId,
        userId: req.user.id,
        action: 'MEMBER_PERMISSIONS_CHANGED',
        metadata: { targetUserId: userId, ...permissions }
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
      const workspaceId = parseInt(req.params.id)
      const userId = parseInt(req.params.userId)

      const check = await wouldRemoveLastAdmin(workspaceId, userId)
      if (check.notFound) return res.status(404).json({ success: false, message: 'Member not found' })
      if (check.lastAdmin) {
        return res.status(400).json({ success: false, message: 'A workspace needs at least one admin' })
      }

      await workspaceService.removeMember({ workspaceId, userId })

      await log({
        workspaceId,
        userId: req.user.id,
        action: 'MEMBER_REMOVED',
        metadata: { targetUserId: userId }
      })

      res.json({ success: true, message: 'Member removed' })
    } catch (err) {
      res.status(500).json({ success: false, message: err.message })
    }
  }
)

/* =========================================================
   GET WORKSPACE MEMBERS (for @mention autocomplete)
========================================================= */
router.get('/:id/members', protect, requireRole('MEMBER'), async (req, res) => {
  try {
    const members = await workspaceService.getWorkspaceMembers(
      parseInt(req.params.id)
    )
    res.json({ success: true, data: members })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
})

module.exports = router
