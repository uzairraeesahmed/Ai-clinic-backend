const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { listUsers, updateSubscription, listDoctors, createUser, updateMe } = require('../controllers/userController');

const router = express.Router();
router.use(protect);

router.patch('/me', updateMe);
router.get('/', requireRole('admin'), listUsers);
router.post('/', requireRole('admin'), createUser);
router.get('/doctors', requireRole('admin', 'receptionist', 'doctor'), listDoctors);
router.patch('/:userId/subscription', requireRole('admin'), updateSubscription);

module.exports = router;
