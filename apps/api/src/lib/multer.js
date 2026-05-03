const multer = require('multer')

// store in memory — we stream directly to Cloudinary
const storage = multer.memoryStorage()

// file type filter
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, webp, gif)'), false)
  }
}

// avatar upload — max 2MB
const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }
})

// attachment upload — max 10MB
const uploadAttachment = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
})

module.exports = { uploadAvatar, uploadAttachment }