const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const { getMyAttendance, markAttendance } = require('../controllers/attendanceController');

const router = express.Router();

router.use(authenticate, requireRole('teacher'));
router.get('/mine', getMyAttendance);
router.post('/', markAttendance);

module.exports = router;
