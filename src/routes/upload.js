const express = require('express');
const { protect } = require('../middleware/auth');
const { uploadFile } = require('../controllers/uploadController');

const router = express.Router();
router.use(protect);

router.post('/', uploadFile);

module.exports = router;
