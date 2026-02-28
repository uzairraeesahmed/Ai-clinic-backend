const express = require('express');
const { protect, requireRole } = require('../middleware/auth');
const { list, getOne, create, downloadPdf } = require('../controllers/prescriptionController');

const router = express.Router();
router.use(protect);

router.get('/', requireRole('admin', 'doctor', 'patient'), list);
router.get('/:id/pdf', requireRole('admin', 'doctor', 'patient'), downloadPdf);
router.get('/:id', requireRole('admin', 'doctor', 'patient'), getOne);
router.post('/', requireRole('doctor', 'admin'), create);

module.exports = router;
