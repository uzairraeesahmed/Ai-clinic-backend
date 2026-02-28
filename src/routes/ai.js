const express = require('express');
const { protect, requireRole, requirePro } = require('../middleware/auth');
const { symptomChecker, prescriptionExplanation } = require('../controllers/aiController');

const router = express.Router();
router.use(protect);

// AI features require Pro plan (per requirement: Free = no AI, Pro = AI enabled)
router.post('/symptom-checker', requireRole('doctor', 'admin'), requirePro, symptomChecker);
router.post('/prescription-explanation', requireRole('doctor', 'admin', 'patient'), requirePro, prescriptionExplanation);

module.exports = router;
