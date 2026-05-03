const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS    // use Gmail App Password
  }
})

const sendMail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `"Team Hub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  })
}

module.exports = { sendMail }