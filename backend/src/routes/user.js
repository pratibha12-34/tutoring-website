const express = require('express');
const { login } = require('../controllers/userController');
const { changeAdminPin } = require('../controllers/adminPinController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Login API is ready. Submit the login form to authenticate.' });
});

router.post('/', login);
router.post('/change-pin', authenticate, requireRole('admin'), changeAdminPin);

module.exports = router;