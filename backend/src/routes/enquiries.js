const express = require('express');
const { rateLimit } = require('express-rate-limit');
const {
    getAdminEnquiries,
    getCandidateConversation,
    replyToEnquiry,
    sendAccessLink,
    sendCandidateMessage,
    submitEnquiry
} = require('../controllers/enquiryController');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many enquiries were submitted. Please try again later.' }
});
const conversationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many conversation requests. Please try again later.' }
});

router.post('/', submitLimiter, submitEnquiry);
router.get('/chat/:token', conversationLimiter, getCandidateConversation);
router.post('/chat/:token/messages', conversationLimiter, sendCandidateMessage);
router.get('/admin', authenticate, requireRole('admin'), getAdminEnquiries);
router.post('/admin/:id/messages', authenticate, requireRole('admin'), replyToEnquiry);
router.post('/admin/:id/access-link', authenticate, requireRole('admin'), sendAccessLink);

module.exports = router;
