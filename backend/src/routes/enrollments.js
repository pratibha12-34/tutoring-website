const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getMyEnrollments,
    enroll,
    getPendingCoursePayments,
    reviewCoursePayment
} = require('../controllers/enrollmentController');

const router = express.Router();

router.get('/mine', authenticate, requireRole('student'), getMyEnrollments);
router.post('/', authenticate, requireRole('student'), enroll);
router.get('/payments/pending', authenticate, requireRole('admin'), getPendingCoursePayments);
router.patch('/payments/:paymentId', authenticate, requireRole('admin'), reviewCoursePayment);

module.exports = router;
