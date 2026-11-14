const express = require('express');
const { register } = require('../controllers/registerController');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({ message: 'Registration API is ready. Submit the registration form to create an account.' });
});

router.post('/', register);

module.exports = router;
