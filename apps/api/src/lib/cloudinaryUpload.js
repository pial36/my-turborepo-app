const cloudinary = require('./cloudinary')

/**
 * Upload a buffer to Cloudinary
 * @param {Buffer} buffer - file buffer from multer
 * @param {Object} options - cloudinary upload options
 * @returns {Promise<string>} secure_url of uploaded file
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) return reject(error)
        resolve(result)
      }
    ).end(buffer)
  })
}

/**
 * Delete a file from Cloudinary by public_id
 * @param {string} publicId
 */
const deleteFromCloudinary = async (publicId) => {
  return cloudinary.uploader.destroy(publicId)
}

/**
 * Extract public_id from a Cloudinary URL
 * e.g. "https://res.cloudinary.com/demo/image/upload/v123/team-hub/avatars/abc.jpg"
 * returns "team-hub/avatars/abc"
 */
const getPublicId = (url) => {
  if (!url) return null
  const parts = url.split('/')
  const filename = parts[parts.length - 1].split('.')[0]
  const folder = parts[parts.length - 2]
  return `${folder}/${filename}`
}

module.exports = { uploadToCloudinary, deleteFromCloudinary, getPublicId }