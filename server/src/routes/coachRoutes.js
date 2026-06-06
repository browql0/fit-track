const express = require('express');
const { auth } = require('../middleware/auth');
const coachController = require('../controllers/coachController');

const router = express.Router();

router.use(auth);

router.get('/', coachController.getCoach);
router.get('/history', coachController.getCoachHistory);

module.exports = router;
