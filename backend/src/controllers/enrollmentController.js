const mongoose = require('mongoose');
const Batch = require('../models/batches');
const Course = require('../models/courses');
const Enrollment = require('../models/enrollment');
const CoursePayment = require('../models/coursePayment');
const Register = require('../models/register');

async function getMyEnrollments(req, res) {
    try {
        const enrollments = await Enrollment.find({ studentId: req.auth.userId }).sort({ enrolledAt: -1 }).lean();
        const courseIds = enrollments.filter((entry) => entry.itemType === 'course').map((entry) => entry.itemId);
        const batchIds = enrollments.filter((entry) => entry.itemType === 'batch').map((entry) => entry.itemId);
        const paymentIds = enrollments.map((entry) => entry.coursePaymentId).filter(Boolean);
        const [courses, batches, pendingPayments, verifiedPayments] = await Promise.all([
            Course.find({ _id: { $in: courseIds } }).lean(),
            Batch.find({ _id: { $in: batchIds } }).lean(),
            CoursePayment.find({ studentId: req.auth.userId, status: 'pending' })
                .populate('courseId', 'course_name')
                .populate('batchId', 'batch_name')
                .sort({ submittedAt: -1 })
                .lean(),
            CoursePayment.find({ _id: { $in: paymentIds }, status: 'verified' }).select('_id').lean()
        ]);
        const verifiedPaymentIds = new Set(verifiedPayments.map((payment) => payment._id.toString()));
        const visibleItems = (items, itemType) => items.filter((item) => {
            const enrollment = enrollments.find((entry) => entry.itemType === itemType && entry.itemId.equals(item._id));
            return !enrollment?.coursePaymentId || verifiedPaymentIds.has(enrollment.coursePaymentId.toString());
        });
        const pendingItems = (itemType) => pendingPayments
            .filter((payment) => payment.itemType === itemType)
            .map((payment) => ({
                itemId: (itemType === 'course' ? payment.courseId?._id : payment.batchId?._id)?.toString(),
                itemName: itemType === 'course'
                    ? payment.courseId?.course_name || 'Unavailable course'
                    : payment.batchId?.batch_name || 'Unavailable batch',
                amount: payment.amount,
                utr: payment.utr,
                submittedAt: payment.submittedAt,
                status: payment.status
            }));
        return res.json({
            courses: visibleItems(courses, 'course'),
            batches: visibleItems(batches, 'batch'),
            pendingCourses: pendingItems('course'),
            pendingBatches: pendingItems('batch')
        });
    } catch (error) {
        console.error('Could not load student enrollments:', error);
        return res.status(500).json({ error: 'Could not load your enrolled courses and batches.' });
    }
}

async function enroll(req, res) {
    const itemType = typeof req.body?.type === 'string' ? req.body.type : '';
    const itemId = typeof req.body?.id === 'string' ? req.body.id : '';
    if (!['course', 'batch'].includes(itemType) || !mongoose.isValidObjectId(itemId)) {
        return res.status(400).json({ error: 'Choose a valid course or batch to enroll in.' });
    }

    try {
        const Resource = itemType === 'course' ? Course : Batch;
        const resource = await Resource.findById(itemId).lean();
        if (!resource) {
            return res.status(404).json({ error: 'That course or batch is no longer available.' });
        }

        if (itemType === 'course') {
            const tuitionRequest = await Register.findOne({
                _id: req.auth.userId,
                role: 'student',
                tuitionCourseIds: resource._id
            }).select('tuitionRequestStatus').lean();
            if (tuitionRequest && tuitionRequest.tuitionRequestStatus !== 'approved') {
                return res.status(403).json({
                    error: tuitionRequest.tuitionRequestStatus === 'rejected'
                        ? 'Your tuition request for this course was rejected.'
                        : 'Wait for an administrator to approve your tuition request before enrolling in this course.'
                });
            }
        }

        const feeField = itemType === 'course' ? 'course_fee' : 'batch_fee';
        const fee = Number(resource[feeField] ?? 0);
        if (!Number.isFinite(fee) || fee < 0) {
            return res.status(400).json({ error: `The ${itemType} fee is invalid. Contact the administrator.` });
        }

        const existingEnrollment = await Enrollment.findOne({
            studentId: req.auth.userId,
            itemType,
            itemId: resource._id
        });
        if (existingEnrollment) {
            return res.status(409).json({ error: `You are already enrolled in this ${itemType}.` });
        }

        if (fee > 0) {
            const utr = typeof req.body?.utr === 'string' ? req.body.utr.trim().toUpperCase() : '';
            const amountInput = req.body?.amount;
            const amountText = typeof amountInput === 'number' || (typeof amountInput === 'string' && amountInput.trim() !== '')
                ? String(amountInput).trim()
                : '';
            const amount = amountText ? Number(amountText) : NaN;
            if (!/^[A-Z0-9/-]{6,80}$/.test(utr)) {
                return res.status(400).json({ error: 'Enter a valid UPI transaction reference after paying the course fee.' });
            }
            if (!Number.isFinite(amount) || !/^\d+(?:\.\d{1,2})?$/.test(amountText)
                || Math.round(amount * 100) !== Math.round(fee * 100)) {
                return res.status(409).json({ error: `The ${itemType} fee changed. Refresh and make sure you pay the current amount.` });
            }
            const vpa = process.env.UPI_VPA?.trim() || '';
            if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(vpa)) {
                return res.status(503).json({ error: 'UPI payments are not configured. Contact the administrator.' });
            }
            const existingPending = await CoursePayment.findOne({
                studentId: req.auth.userId,
                itemType,
                [itemType === 'course' ? 'courseId' : 'batchId']: resource._id,
                status: 'pending'
            });
            if (existingPending) {
                return res.status(409).json({ error: `Your payment is already waiting for administrator verification for this ${itemType}.` });
            }
            const payment = await CoursePayment.create({
                studentId: req.auth.userId,
                itemType,
                [itemType === 'course' ? 'courseId' : 'batchId']: resource._id,
                amount: fee,
                utr
            });
            return res.status(201).json({
                message: `Payment reference submitted. Enrollment will be enabled after an administrator verifies the ${itemType} payment.`,
                payment
            });
        }

        const enrollment = await Enrollment.create({
            studentId: req.auth.userId,
            itemType,
            itemId: resource._id
        });
        return res.status(201).json({ message: `Enrolled in ${itemType} successfully.`, enrollment });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'You are already enrolled, or this UPI transaction reference was already submitted.' });
        }
        console.error('Could not save student enrollment:', error);
        return res.status(500).json({ error: 'Could not save your enrollment. Please try again.' });
    }
}

async function getPendingCoursePayments(req, res) {
    try {
        const payments = await CoursePayment.find({ status: 'pending' })
            .populate('studentId', 'username email')
            .populate('courseId', 'course_name')
            .populate('batchId', 'batch_name')
            .sort({ submittedAt: 1 })
            .lean();
        return res.json(payments.map((payment) => ({
            id: payment._id,
            username: payment.studentId?.username || 'Unknown student',
            email: payment.studentId?.email || '',
            itemType: payment.itemType,
            itemName: payment.itemType === 'course'
                ? payment.courseId?.course_name || 'Unavailable course'
                : payment.batchId?.batch_name || 'Unavailable batch',
            amount: payment.amount,
            utr: payment.utr,
            submittedAt: payment.submittedAt
        })));
    } catch (error) {
        console.error('Could not load pending course payments:', error);
        return res.status(500).json({ error: 'Could not load pending course payments.' });
    }
}

async function reviewCoursePayment(req, res) {
    const { paymentId } = req.params;
    if (!mongoose.isValidObjectId(paymentId)) return res.status(400).json({ error: 'Invalid payment ID.' });

    const action = req.body?.action;
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Choose whether to approve or reject the payment.' });
    }

    try {
        const payment = await CoursePayment.findOne({ _id: paymentId, status: 'pending' }).lean();
        if (!payment) {
            const existingPayment = await CoursePayment.findById(paymentId).select('status').lean();
            return existingPayment
                ? res.status(409).json({ error: 'This course payment has already been reviewed.' })
                : res.status(404).json({ error: 'Course payment not found.' });
        }

        const updatedPayment = await CoursePayment.findOneAndUpdate(
            { _id: payment._id, status: 'pending' },
            {
                $set: {
                    status: action === 'approve' ? 'verified' : 'rejected',
                    reviewedAt: new Date(),
                    reviewedBy: req.auth.userId
                }
            },
            { returnDocument: 'after', runValidators: true }
        );
        if (!updatedPayment) {
            return res.status(409).json({ error: 'This course payment was reviewed by another administrator.' });
        }

        try {
            if (action === 'approve') {
                await Enrollment.findOneAndUpdate(
                    {
                        studentId: payment.studentId,
                        itemType: payment.itemType,
                        itemId: payment.itemType === 'course' ? payment.courseId : payment.batchId
                    },
                    {
                        $setOnInsert: {
                            studentId: payment.studentId,
                            itemType: payment.itemType,
                            itemId: payment.itemType === 'course' ? payment.courseId : payment.batchId,
                            coursePaymentId: payment._id
                        }
                    },
                    { upsert: true, returnDocument: 'after', runValidators: true }
                );
            } else {
                await Enrollment.deleteOne({ coursePaymentId: payment._id });
            }
        } catch (error) {
            await CoursePayment.updateOne(
                { _id: payment._id, status: action === 'approve' ? 'verified' : 'rejected' },
                { $set: { status: 'pending', reviewedAt: null, reviewedBy: null } }
            );
            throw error;
        }

        return res.json({
            message: action === 'approve'
                ? `${payment.itemType === 'course' ? 'Course' : 'Batch'} payment verified and enrollment enabled.`
                : `${payment.itemType === 'course' ? 'Course' : 'Batch'} payment rejected.`
        });
    } catch (error) {
        console.error('Could not review course payment:', error);
        return res.status(500).json({ error: 'Could not review the course payment.' });
    }
}

module.exports = { getMyEnrollments, enroll, getPendingCoursePayments, reviewCoursePayment };
