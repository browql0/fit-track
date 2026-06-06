const coachEngine = require('../ai/coachEngine');
const coachSnapshotService = require('../services/coachSnapshotService');

const getCoach = async (req, res, next) => {
  try {
    const report = await coachEngine.getCoachReport(req.user.id);
    res.json(report);
  } catch (error) {
    next(error);
  }
};

const getCoachHistory = async (req, res, next) => {
  try {
    const snapshots = await coachSnapshotService.getCoachSnapshots(req.user.id, req.query.days);
    res.json(snapshots);
  } catch (error) {
    next(error);
  }
};

module.exports = { getCoach, getCoachHistory };
