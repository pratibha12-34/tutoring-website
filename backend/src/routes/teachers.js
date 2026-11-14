const express = require('express');
const { authenticate, requireRole } = require('../middleware/auth');
const {
    getTeachers,
    getAdminTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    recordTeacherSalaryPayout
} = require('../controllers/teacherController');

const router = express.Router();

router.get('/', getTeachers);
router.get('/admin', authenticate, requireRole('admin'), getAdminTeachers);
router.post('/', authenticate, requireRole('admin'), createTeacher);
router.post('/:id/payouts', authenticate, requireRole('admin'), recordTeacherSalaryPayout);
router.put('/:id', authenticate, requireRole('admin'), updateTeacher);
router.delete('/:id', authenticate, requireRole('admin'), deleteTeacher);

module.exports = router;
