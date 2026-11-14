const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getStudentFees,
    updateStudentFee,
    getMyStudentFee,
    submitStudentPayment,
    getPendingStudentPayments,
    reviewStudentPayment,
    getMyTuitionRequest,
    getTuitionRequests,
    reviewTuitionRequest
} = require('../controllers/studentFeeController');

const router = express.Router();

router.get('/fees/mine', authenticate, requireRole('student'), getMyStudentFee);
router.get('/tuition-request/mine', authenticate, requireRole('student'), getMyTuitionRequest);
router.get('/tuition-requests', authenticate, requireRole('admin'), getTuitionRequests);
router.patch('/tuition-requests/:studentId', authenticate, requireRole('admin'), reviewTuitionRequest);
router.post('/fees/payments', authenticate, requireRole('student'), submitStudentPayment);
router.get('/fees/payments/pending', authenticate, requireRole('admin'), getPendingStudentPayments);
router.patch('/fees/payments/:paymentId', authenticate, requireRole('admin'), reviewStudentPayment);
router.get('/fees', authenticate, requireRole('admin'), getStudentFees);
router.put('/fees/:studentId', authenticate, requireRole('admin'), updateStudentFee);

module.exports = router;
