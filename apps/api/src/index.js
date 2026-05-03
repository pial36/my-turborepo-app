require('dotenv').config()
const swaggerUi = require('swagger-ui-express')
const swaggerSpec = require('./lib/swagger')

const express = require("express")
const cors = require("cors")
const cookieParser = require("cookie-parser")
const { createServer } = require("http")
const { Server } = require("socket.io")
const { handleUploadError } = require('./middleware/upload.middleware')

const app = express()
const httpServer = createServer(app)

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
})

app.set('io', io)

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true,
}))
app.use(express.json())
app.use(cookieParser())

// Health routes
app.get("/", (req, res) => res.send("API running 🚀"))
app.get("/health", (req, res) => res.json({ status: "OK" }))

//  All API routes
app.use('/api/auth',          require('./routes/auth.routes'))
app.use('/api/workspaces',    require('./routes/workspace.routes'))
app.use('/api/goals',         require('./routes/goal.routes'))
app.use('/api/action-items',  require('./routes/actionItem.routes'))
app.use('/api/announcements', require('./routes/announcement.routes'))
app.use('/api/analytics',     require('./routes/analytics.routes'))
app.use('/api/notifications', require('./routes/notification.routes'))
app.use('/api/audit-logs',    require('./routes/auditLog.routes'))


//  serve swagger docs at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Team Hub API Docs',
  customCss: '.swagger-ui .topbar { background-color: #6366f1; }'
}))

//  Upload error handler MUST come after routes, not before
app.use(handleUploadError)

// Socket handler
require("./sockets/socket")(io)

const PORT = process.env.PORT || 5000
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
