const jwt = require('jsonwebtoken')
const prisma = require('../lib/prisma')

// presence: { workspaceId: Map(userId -> Set(socketId)) }
// tracked per socket so closing one tab doesn't mark a user offline
const onlineMembers = {}

const onlineUserIds = (workspaceId) =>
  Array.from((onlineMembers[workspaceId] || new Map()).keys())

// read a single cookie value from the raw Cookie header
const getCookie = (header, name) => {
  if (!header) return null
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

module.exports = (io) => {

  // ─── Auth middleware — verify token before any connection ───
  // The access token is an httpOnly cookie, so the browser sends it with the
  // handshake (withCredentials) and client JS can never read it.
  io.use((socket, next) => {
    try {
      const token = getCookie(socket.handshake.headers.cookie, 'accessToken')
      if (!token) return next(new Error('Not authenticated'))

      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
      socket.user = decoded   // { id, email }
      next()
    } catch (err) {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    // personal room for direct notifications: io.to(`user:<id>`)
    socket.join(`user:${socket.user.id}`)

    const broadcastPresence = (workspaceId) => {
      io.to(`workspace:${workspaceId}`).emit('members:online', {
        workspaceId,
        userIds: onlineUserIds(workspaceId)
      })
    }

    const leave = (workspaceId) => {
      if (!workspaceId) return
      socket.leave(`workspace:${workspaceId}`)

      const users = onlineMembers[workspaceId]
      const sockets = users && users.get(socket.user.id)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) users.delete(socket.user.id)
      }
      if (socket.currentWorkspace === workspaceId) socket.currentWorkspace = null
      broadcastPresence(workspaceId)
    }

    // ─── JOIN WORKSPACE ROOM (membership verified) ───
    // All workspace events are emitted by the REST routes after the DB write;
    // clients only join/leave rooms, they never broadcast.
    socket.on('workspace:join', async (rawId) => {
      try {
        const workspaceId = parseInt(rawId)
        if (!workspaceId) return

        const member = await prisma.workspaceMember.findUnique({
          where: { userId_workspaceId: { userId: socket.user.id, workspaceId } }
        })
        if (!member) return socket.emit('error', { message: 'Not a workspace member' })

        // one active workspace per socket
        if (socket.currentWorkspace && socket.currentWorkspace !== workspaceId) {
          leave(socket.currentWorkspace)
        }

        socket.join(`workspace:${workspaceId}`)
        socket.currentWorkspace = workspaceId

        if (!onlineMembers[workspaceId]) onlineMembers[workspaceId] = new Map()
        const users = onlineMembers[workspaceId]
        if (!users.has(socket.user.id)) users.set(socket.user.id, new Set())
        users.get(socket.user.id).add(socket.id)

        broadcastPresence(workspaceId)
      } catch (err) {
        socket.emit('error', { message: err.message })
      }
    })

    // ─── LEAVE WORKSPACE ROOM ───
    socket.on('workspace:leave', (rawId) => leave(parseInt(rawId)))

    // ─── DISCONNECT ───
    socket.on('disconnect', () => leave(socket.currentWorkspace))
  })

  // helper — expose io so routes can emit directly
  // usage: req.app.get('io').to(room).emit(...)
  return io
}
