const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { list, getOne, create, update, delete: cancel } = require('../controllers/appointmentController');

const router = express.Router();
router.use(protect);

router.get('/', requireRole('admin', 'doctor', 'receptionist', 'patient'), list);
router.get('/:id', requireRole('admin', 'doctor', 'receptionist', 'patient'), getOne);
router.post('/', requireRole('admin', 'receptionist', 'doctor'), create);
router.patch('/:id', requireRole('admin', 'doctor', 'receptionist'), update);
router.delete('/:id', requireRole('admin', 'doctor', 'receptionist'), cancel);

module.exports = router;
