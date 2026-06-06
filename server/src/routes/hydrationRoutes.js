const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { auth } = require('../middleware/auth');
const hydrationController = require('../controllers/hydrationController');

const router = express.Router();

router.use(auth);

router.get('/', hydrationController.getHydrationEntries);
router.get('/summary', hydrationController.getHydrationSummary);

router.post(
  '/',
  [
    body('amountMl').isInt({ min: 50, max: 5000 }).withMessage('Quantite invalide'),
    body('entryDate').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Date invalide'),
  ],
  validate,
  hydrationController.addHydrationEntry
);

router.delete('/:id', hydrationController.deleteHydrationEntry);

module.exports = router;
