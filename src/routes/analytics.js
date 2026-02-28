const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { adminDashboard, doctorDashboard } = require('../controllers/analyticsController');

const router = express.Router();
router.use(protect);

router.get('/admin', requireRole('admin'), adminDashboard);
router.get('/doctor', requireRole('doctor'), doctorDashboard);

module.exports = router;
