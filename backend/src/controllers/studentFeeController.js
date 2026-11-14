const mongoose = require('mongoose');
const Register = require('../models/register');
const Enrollment = require('../models/enrollment');
const StudentFee = require('../models/studentFee');

function formatStudentFee(student, fee) {
    const totalFee = fee?.totalFee ?? null;
    const paidAmount = fee?.paidAmount ?? null;
    return {
        id: student._id,
        username: student.username,
        email: student.email,
        registeredAt: student.createdAt,
        totalFee,
        paidAmount,
        remaining: totalFee == null || paidAmount == null ? null : totalFee - paidAmount,
        payments: (fee?.payments || [])
            .slice()
            .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt))
            .map((payment) => ({
                id: payment._id,
                amount: payment.amount,
                utr: payment.utr,
                status: payment.status,
                submittedAt: payment.submittedAt,
                reviewedAt: payment.reviewedAt
            }))
    };
}

async function getStudentFees(req, res) {
    try {
        const enrolledStudentIds = await Enrollment.distinct('studentId', { itemType: 'course' });
        const feeRecords = await StudentFee.find().select('studentId').lean();
        const studentIds = [...new Set([
            ...enrolledStudentIds.map((id) => id.toString()),
            ...feeRecords.map((fee) => fee.studentId.toString())
        ])];
        const students = await Register.find({ role: 'student', _id: { $in: studentIds } })
            .select('username email createdAt')
            .sort({ username: 1 })
            .lean();
        const fees = await StudentFee.find({ studentId: { $in: students.map((student) => student._id) } }).lean();
        const feesByStudentId = new Map(fees.map((fee) => [fee.studentId.toString(), fee]));
        return res.json(students.map((student) => formatStudentFee(
            student,
            feesByStudentId.get(student._id.toString())
        )));
    } catch (error) {
        console.error('Could not load student fees:', error);
        return res.status(500).json({ error: 'Could not load student fee details.' });
    }
}

async function updateStudentFee(req, res) {
    const studentId = req.params.studentId;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ error: 'Invalid student ID.' });

    const totalFeeInput = req.body?.totalFee;
    const paidAmountInput = req.body?.paidAmount;
    const isNumericInput = (value) => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '');
    const totalFee = isNumericInput(totalFeeInput) ? Number(totalFeeInput) : NaN;
    const paidAmount = isNumericInput(paidAmountInput) ? Number(paidAmountInput) : NaN;
    if (!Number.isFinite(totalFee) || totalFee < 0) {
        return res.status(400).json({ error: 'Enter a valid non-negative total fee.' });
    }
    if (!Number.isFinite(paidAmount) || paidAmount < 0) {
        return res.status(400).json({ error: 'Enter a valid non-negative paid amount.' });
    }
    if (paidAmount > totalFee) {
        return res.status(400).json({ error: 'The paid amount cannot exceed the total fee.' });
    }

    try {
        const student = await Register.findOne({ _id: studentId, role: 'student' })
            .select('username email createdAt')
            .lean();
        if (!student) return res.status(404).json({ error: 'Student account not found.' });

        const fee = await StudentFee.findOneAndUpdate(
            { studentId: student._id },
            { $set: { totalFee, paidAmount } },
            { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }
        ).lean();

        return res.json(formatStudentFee(student, fee));
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Fee details for this student were changed at the same time. Refresh and try again.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Check the total fee and paid amount.' });
        }
        console.error('Could not update student fees:', error);
        return res.status(500).json({ error: 'Could not save student fee details.' });
    }
}

function getUpiDetails() {
    const vpa = process.env.UPI_VPA?.trim() || '';
    const merchantName = process.env.UPI_MERCHANT_NAME?.trim() || 'Garvit Classes';
    return {
        enabled: /^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(vpa),
        vpa,
        merchantName
    };
}

async function getMyStudentFee(req, res) {
    try {
        const fee = await StudentFee.findOne({ studentId: req.auth.userId }).lean();
        return res.json({
            fee: fee ? {
                totalFee: fee.totalFee,
                paidAmount: fee.paidAmount,
                remaining: fee.totalFee - fee.paidAmount,
                payments: (fee.payments || []).slice().sort((left, right) => (
                    new Date(right.submittedAt) - new Date(left.submittedAt)
                ))
            } : null,
            upi: getUpiDetails()
        });
    } catch (error) {
        console.error('Could not load student payment details:', error);
        return res.status(500).json({ error: 'Could not load your payment details.' });
    }
}

async function submitStudentPayment(req, res) {
    const amountInput = req.body?.amount;
    const amountText = typeof amountInput === 'number' || (typeof amountInput === 'string' && amountInput.trim() !== '')
        ? String(amountInput).trim()
        : '';
    const amount = amountText
        ? Number(amountInput)
        : NaN;
    const utr = typeof req.body?.utr === 'string' ? req.body.utr.trim().toUpperCase() : '';

    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
        return res.status(400).json({ error: 'Enter a valid payment amount with up to two decimal places.' });
    }
    if (!/^[A-Z0-9/-]{6,80}$/.test(utr)) {
        return res.status(400).json({ error: 'Enter a valid UPI transaction reference (6–80 letters, numbers, / or -).' });
    }
    if (!getUpiDetails().enabled) {
        return res.status(503).json({ error: 'UPI payments are not configured. Contact the administrator.' });
    }

    try {
        const fee = await StudentFee.findOneAndUpdate(
            {
                studentId: req.auth.userId,
                'payments.utr': { $ne: utr },
                $expr: {
                    $let: {
                        vars: {
                            pendingTotal: {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: '$payments',
                                                as: 'payment',
                                                cond: { $eq: ['$$payment.status', 'pending'] }
                                            }
                                        },
                                        as: 'pendingPayment',
                                        in: '$$pendingPayment.amount'
                                    }
                                }
                            }
                        },
                        in: {
                            $lte: [
                                { $round: [{ $add: ['$paidAmount', '$$pendingTotal', amount] }, 2] },
                                '$totalFee'
                            ]
                        }
                    }
                }
            },
            {
                $push: {
                    payments: { amount, utr, status: 'pending', submittedAt: new Date() }
                }
            },
            { returnDocument: 'after', runValidators: true }
        ).lean();

        if (!fee) {
            const existingFee = await StudentFee.findOne({ studentId: req.auth.userId }).lean();
            if (!existingFee) return res.status(404).json({ error: 'Your fee has not been set by the administrator yet.' });
            if ((existingFee.payments || []).some((payment) => payment.utr === utr)) {
                return res.status(409).json({ error: 'This transaction reference has already been submitted.' });
            }
            return res.status(400).json({ error: 'The payment amount exceeds the balance available for new payment references.' });
        }

        return res.status(201).json({
            fee: {
                totalFee: fee.totalFee,
                paidAmount: fee.paidAmount,
                remaining: fee.totalFee - fee.paidAmount,
                payments: fee.payments.slice().sort((left, right) => (
                    new Date(right.submittedAt) - new Date(left.submittedAt)
                ))
            },
            message: 'Payment reference submitted. It will remain pending until an administrator verifies it.'
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'This transaction reference has already been submitted.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Check the payment amount and transaction reference.' });
        }
        console.error('Could not submit student payment:', error);
        return res.status(500).json({ error: 'Could not submit your payment reference.' });
    }
}

async function getPendingStudentPayments(req, res) {
    try {
        const feeRecords = await StudentFee.find({ 'payments.status': 'pending' })
            .populate('studentId', 'username email')
            .lean();
        const payments = feeRecords.flatMap((fee) => (
            (fee.payments || [])
                .filter((payment) => payment.status === 'pending')
                .map((payment) => ({
                    id: payment._id,
                    studentId: fee.studentId?._id,
                    username: fee.studentId?.username || 'Unknown student',
                    email: fee.studentId?.email || '',
                    amount: payment.amount,
                    utr: payment.utr,
                    submittedAt: payment.submittedAt
                }))
        ));
        payments.sort((left, right) => new Date(left.submittedAt) - new Date(right.submittedAt));
        return res.json(payments);
    } catch (error) {
        console.error('Could not load pending student payments:', error);
        return res.status(500).json({ error: 'Could not load pending payment references.' });
    }
}

async function reviewStudentPayment(req, res) {
    const { paymentId } = req.params;
    if (!mongoose.isValidObjectId(paymentId)) return res.status(400).json({ error: 'Invalid payment ID.' });

    const action = req.body?.action;
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Choose whether to approve or reject the payment.' });
    }

    try {
        const existingFee = await StudentFee.findOne({ 'payments._id': paymentId }).lean();
        if (!existingFee) return res.status(404).json({ error: 'Payment reference not found.' });
        const existingPayment = existingFee.payments.find((payment) => payment._id.toString() === paymentId);
        if (existingPayment?.status !== 'pending') {
            return res.status(409).json({ error: 'This payment reference has already been reviewed.' });
        }

        const paymentMatch = {
            payments: { $elemMatch: { _id: new mongoose.Types.ObjectId(paymentId), status: 'pending' } }
        };
        const update = {
            $set: {
                'payments.$.status': action === 'approve' ? 'verified' : 'rejected',
                'payments.$.reviewedAt': new Date(),
                'payments.$.reviewedBy': new mongoose.Types.ObjectId(req.auth.userId)
            }
        };
        if (action === 'approve') {
            paymentMatch.$expr = {
                $lte: [
                    { $round: [{ $add: ['$paidAmount', existingPayment.amount] }, 2] },
                    '$totalFee'
                ]
            };
            update.$inc = { paidAmount: existingPayment.amount };
        }

        const fee = await StudentFee.findOneAndUpdate(paymentMatch, update, {
            returnDocument: 'after',
            runValidators: true
        }).lean();
        if (fee) return res.json({ message: action === 'approve' ? 'Payment verified and fee balance updated.' : 'Payment reference rejected.' });

        const latestFee = await StudentFee.findOne({ 'payments._id': paymentId }).lean();
        if (!latestFee) return res.status(404).json({ error: 'Payment reference not found.' });
        const latestPayment = latestFee.payments.find((payment) => payment._id.toString() === paymentId);
        if (latestPayment?.status !== 'pending') {
            return res.status(409).json({ error: 'This payment reference has already been reviewed.' });
        }
        return res.status(409).json({ error: 'Approving this payment would exceed the student’s fee total.' });
    } catch (error) {
        console.error('Could not review student payment:', error);
        return res.status(500).json({ error: 'Could not review the payment reference.' });
    }
}

async function getMyTuitionRequest(req, res) {
    try {
        const student = await Register.findOne({ _id: req.auth.userId, role: 'student' })
            .select('tuitionClass tuitionCourseIds tuitionRequestStatus tuitionReviewedAt')
            .populate('tuitionCourseIds', 'course_id course_name course_class course_subject course_duration course_fee')
            .lean();
        if (!student) return res.status(404).json({ error: 'Student account not found.' });
        return res.json({
            tuitionClass: student.tuitionClass || '',
            status: student.tuitionRequestStatus || null,
            reviewedAt: student.tuitionReviewedAt || null,
            courses: student.tuitionCourseIds || []
        });
    } catch (error) {
        console.error('Could not load student tuition request:', error);
        return res.status(500).json({ error: 'Could not load your tuition request.' });
    }
}

async function getTuitionRequests(req, res) {
    try {
        const students = await Register.find({
            role: 'student',
            tuitionRequestStatus: { $in: ['pending', 'approved', 'rejected'] },
            tuitionCourseIds: { $exists: true, $ne: [] }
        })
            .select('username email tuitionClass tuitionCourseIds tuitionRequestStatus tuitionReviewedAt createdAt')
            .populate('tuitionCourseIds', 'course_id course_name course_class course_subject')
            .sort({ tuitionRequestStatus: 1, createdAt: -1 })
            .lean();
        return res.json(students.map((student) => ({
            id: student._id,
            username: student.username,
            email: student.email,
            tuitionClass: student.tuitionClass,
            courses: student.tuitionCourseIds || [],
            status: student.tuitionRequestStatus,
            createdAt: student.createdAt,
            reviewedAt: student.tuitionReviewedAt
        })));
    } catch (error) {
        console.error('Could not load tuition requests:', error);
        return res.status(500).json({ error: 'Could not load tuition requests.' });
    }
}

async function reviewTuitionRequest(req, res) {
    const { studentId } = req.params;
    if (!mongoose.isValidObjectId(studentId)) return res.status(400).json({ error: 'Invalid student ID.' });

    const action = req.body?.action;
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Choose whether to approve or reject the tuition request.' });
    }

    try {
        const student = await Register.findOneAndUpdate(
            {
                _id: studentId,
                role: 'student',
                tuitionRequestStatus: 'pending',
                tuitionCourseIds: { $exists: true, $ne: [] }
            },
            {
                $set: {
                    tuitionRequestStatus: action === 'approve' ? 'approved' : 'rejected',
                    tuitionReviewedAt: new Date(),
                    tuitionReviewedBy: req.auth.userId
                }
            },
            { returnDocument: 'after', runValidators: true }
        ).select('username tuitionRequestStatus');

        if (!student) {
            const existing = await Register.findOne({ _id: studentId, role: 'student' })
                .select('tuitionRequestStatus')
                .lean();
            return existing
                ? res.status(409).json({ error: 'This tuition request is no longer pending.' })
                : res.status(404).json({ error: 'Student tuition request not found.' });
        }

        return res.json({
            message: action === 'approve'
                ? `Tuition request approved for ${student.username}.`
                : `Tuition request rejected for ${student.username}.`,
            status: student.tuitionRequestStatus
        });
    } catch (error) {
        console.error('Could not review tuition request:', error);
        return res.status(500).json({ error: 'Could not review the tuition request.' });
    }
}

module.exports = {
    getStudentFees,
    updateStudentFee,
    getMyStudentFee,
    submitStudentPayment,
    getPendingStudentPayments,
    reviewStudentPayment,
    getMyTuitionRequest,
    getTuitionRequests,
    reviewTuitionRequest
};
