const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { list, getOne, create, update, getHistory } = require('../controllers/patientController');

const router = express.Router();
router.use(protect);

router.get('/', requireRole('admin', 'doctor', 'receptionist', 'patient'), list);
router.get('/:id', requireRole('admin', 'doctor', 'receptionist', 'patient'), getOne);
router.get('/:id/history', requireRole('admin', 'doctor', 'receptionist', 'patient'), getHistory);
router.post('/', requireRole('admin', 'receptionist'), create);
router.patch('/:id', requireRole('admin', 'receptionist', 'patient'), update);

module.exports = router;
