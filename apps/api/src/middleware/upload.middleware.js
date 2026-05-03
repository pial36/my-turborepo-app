const multer = require('multer')

// catches multer-specific errors and returns clean JSON
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large'
      })
    }
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message
    })
  }

  next()
}

module.exports = { handleUploadError }