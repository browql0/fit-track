const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const missionController = require('../controllers/missionController');

const router = express.Router();

router.use(auth);

router.get('/completions', missionController.getMissionCompletions);
router.post(
  '/complete',
  [
    body('missionId').trim().notEmpty().isLength({ max: 100 }).withMessage('missionId requis'),
    body('missionDate').optional().matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date invalide'),
  ],
  validate,
  missionController.completeMission
);

module.exports = router;
