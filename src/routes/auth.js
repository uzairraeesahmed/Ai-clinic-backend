const express = require('express');
const { signup, login, getMe, logout } = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', getMe);
router.post('/logout', logout);

module.exports = router;
