const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

// track online members per workspace
// { workspaceId: Set(userId, userId, ...) }
const onlineMembers = {}

module.exports = (io) => {

  // ─── Auth middleware — verify token before any connection ───
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token
      if (!token) return next(new Error('Not authenticated'))

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
      socket.user = decoded   // { id, email }
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`✅ User ${socket.user.id} connected — socket: ${socket.id}`)

    // ─── Auto-join personal room for direct notifications ───
    // This is what allows io.to(`user:${userId}`).emit('notification:new', ...) to work
    socket.join(`user:${socket.user.id}`)
    console.log(`User ${socket.user.id} joined personal room user:${socket.user.id}`)

    // ─────────────────────────────────────────────
    // 1. JOIN WORKSPACE ROOM
    // ─────────────────────────────────────────────
    socket.on('workspace:join', async (workspaceId) => {
      try {
        // verify user is actually a member
        const member = await prisma.workspaceMember.findUnique({
          where: {
            userId_workspaceId: {
              userId: socket.user.id,
              workspaceId: parseInt(workspaceId)
            }
          }
        })
        if (!member) return socket.emit('error', { message: 'Not a workspace member' })

        const room = `workspace:${workspaceId}`
        socket.join(room)
        socket.currentWorkspace = parseInt(workspaceId)

        // track online members
        if (!onlineMembers[workspaceId]) {
          onlineMembers[workspaceId] = new Set()
        }
        onlineMembers[workspaceId].add(socket.user.id)

        // emit to joining user first so they see the list immediately
        socket.emit('members:online', {
          workspaceId,
          userIds: Array.from(onlineMembers[workspaceId])
        })

        // then emit to other members already in room so they see the new member
        socket.to(room).emit('members:online', {
          workspaceId,
          userIds: Array.from(onlineMembers[workspaceId])
        })

        console.log(`✅ User ${socket.user.id} joined room ${room} — Online: [${Array.from(onlineMembers[workspaceId]).join(', ')}]`)
      } catch (err) {
        socket.emit('error', { message: err.message })
      }
    })

    // ─────────────────────────────────────────────
    // 2. LEAVE WORKSPACE ROOM
    // ─────────────────────────────────────────────
    socket.on('workspace:leave', (workspaceId) => {
      const room = `workspace:${workspaceId}`
      socket.leave(room)

      if (onlineMembers[workspaceId]) {
        onlineMembers[workspaceId].delete(socket.user.id)

        // emit updated list to remaining members
        io.to(room).emit('members:online', {
          workspaceId,
          userIds: Array.from(onlineMembers[workspaceId])
        })

        console.log(`✅ User ${socket.user.id} left room ${room} — Remaining online: [${Array.from(onlineMembers[workspaceId]).join(', ')}]`)
      }
    })

    // ─────────────────────────────────────────────
    // 3. NEW ANNOUNCEMENT
    // ─────────────────────────────────────────────
    // called from announcement.routes.js after DB insert
    socket.on('announcement:new', (data) => {
      // data: { workspaceId, announcement }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('announcement:new', data.announcement)
    })

    // ─────────────────────────────────────────────
    // 4. REACTION TOGGLED
    // ─────────────────────────────────────────────
    socket.on('reaction:toggle', (data) => {
      // data: { workspaceId, announcementId, emoji, action, userId }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('reaction:updated', data)
    })

    // ─────────────────────────────────────────────
    // 5. NEW COMMENT
    // ─────────────────────────────────────────────
    socket.on('comment:new', (data) => {
      // data: { workspaceId, announcementId, comment }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('comment:new', data)
    })

    // ─────────────────────────────────────────────
    // 6. GOAL STATUS CHANGED
    // ─────────────────────────────────────────────
    socket.on('goal:statusChanged', (data) => {
      // data: { workspaceId, goalId, status }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('goal:statusChanged', data)
    })

    // ─────────────────────────────────────────────
    // 7. ACTION ITEM STATUS CHANGED (Kanban drag)
    // ─────────────────────────────────────────────
    socket.on('actionItem:statusChanged', (data) => {
      // data: { workspaceId, actionItemId, status }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('actionItem:statusChanged', data)
    })

    // ─────────────────────────────────────────────
    // 8. GOAL ACTIVITY UPDATE POSTED
    // ─────────────────────────────────────────────
    socket.on('goal:updatePosted', (data) => {
      // data: { workspaceId, goalId, update }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('goal:updatePosted', data)
    })

    // ─────────────────────────────────────────────
    // 9. @MENTION NOTIFICATION
    // ─────────────────────────────────────────────
    // send directly to a specific user's personal room
    socket.on('notification:mention', (data) => {
      // data: { targetUserId, notification }
      // each user auto-joins their personal room on connect (see below)
      io.to(`user:${data.targetUserId}`).emit('notification:new', data.notification)
    })

    // ─────────────────────────────────────────────
    // 10. MEMBER INVITED TO WORKSPACE
    // ─────────────────────────────────────────────
    socket.on('member:invited', (data) => {
      // data: { workspaceId, member }
      const room = `workspace:${data.workspaceId}`
      socket.to(room).emit('member:invited', data.member)
    })

    // ─────────────────────────────────────────────
    // 11. DISCONNECT
    // ─────────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`❌ User ${socket.user.id} disconnected (socket: ${socket.id})`)

      // remove from all workspace online lists
      for (const [workspaceId, members] of Object.entries(onlineMembers)) {
        if (members.has(socket.user.id)) {
          members.delete(socket.user.id)

          // emit updated online list to remaining members
          io.to(`workspace:${workspaceId}`).emit('members:online', {
            workspaceId,
            userIds: Array.from(members)
          })

          console.log(`   ↳ Removed from workspace ${workspaceId} — Remaining: [${Array.from(members).join(', ')}]`)
        }
      }
    })
  })

  // helper — expose io so routes can emit directly
  // usage: req.app.get('io').to(room).emit(...)
  return io
}