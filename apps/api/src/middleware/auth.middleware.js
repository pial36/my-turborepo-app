// middleware/auth.middleware.js
const jwt = require('jsonwebtoken')

const protect = (req, res, next) => {
  try {
    const token = req.cookies.accessToken
    if (!token) return res.status(401).json({ success: false, message: 'Not authenticated' })

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    req.user = {
        id: decoded.id,
        email: decoded.email
    }      // { id, email }
    next()
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' })
  }
}

module.exports = { protect }