const  prisma  = require('../lib/prisma')
const bcrypt = require('bcryptjs')

const register = async ({ name, email, password }) => {
  console.log("REGISTER SERVICE HIT", { name, email, password })

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/

  if (!passwordRegex.test(password)) {
    throw new Error(
      'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
    )
  }
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('Email already exists')

  const hashed = await bcrypt.hash(password, 10)

  return prisma.user.create({
    data: { name, email, password: hashed },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true }
  })
  
}

const findByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } })
}

const findById = async (id) => {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, avatar: true, createdAt: true }
  })
}

const updateAvatar = async (userId, avatarUrl) => {
  return prisma.user.update({
    where: { id: userId },
    data: { avatar: avatarUrl },
    select: { id: true, name: true, email: true, avatar: true }
  })
}

const updateProfile = async (userId, data) => {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, avatar: true }
  })
}

module.exports = { register, findByEmail, findById, updateAvatar, updateProfile }