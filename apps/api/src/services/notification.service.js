const  prisma  = require('../lib/prisma')

const getUserNotifications = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

// scoped by userId so users can only touch their own notifications
const markAsRead = async (notificationId, userId) => {
  const { count } = await prisma.notification.updateMany({
    where: { id: notificationId, userId },
    data: { read: true }
  })
  return count > 0
}

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true }
  })
}

const deleteNotification = async (notificationId, userId) => {
  const { count } = await prisma.notification.deleteMany({
    where: { id: notificationId, userId }
  })
  return count > 0
}

module.exports = {
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
}