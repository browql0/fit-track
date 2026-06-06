const prisma = require('../config/prismaClient');
const { parseDateOnly } = require('../utils/dateUtils');

function todayDate() {
  return parseDateOnly(new Date().toISOString().slice(0, 10), 'activityDate');
}

async function recordActivity(userId, activityType = 'app_activity', activityDate = todayDate()) {
  return prisma.userActivity.upsert({
    where: {
      userId_activityType_activityDate: {
        userId,
        activityType,
        activityDate,
      },
    },
    update: {},
    create: {
      userId,
      activityType,
      activityDate,
    },
  });
}

module.exports = { recordActivity };
