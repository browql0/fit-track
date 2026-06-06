const missionService = require('../services/missionService');

const completeMission = async (req, res, next) => {
  try {
    const completion = await missionService.completeMission(req.user.id, req.body);
    res.status(201).json({ message: 'Mission completee', completion });
  } catch (error) {
    next(error);
  }
};

const getMissionCompletions = async (req, res, next) => {
  try {
    const completions = await missionService.getMissionCompletions(req.user.id, req.query.days);
    res.json(completions);
  } catch (error) {
    next(error);
  }
};

module.exports = { completeMission, getMissionCompletions };
