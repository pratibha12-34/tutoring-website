const mongoose = require('mongoose');
const Teacher = require('../models/teacher');

function validateTeacher(body) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const language = typeof body?.language === 'string' ? body.language.trim() : '';
    const salary = body?.salary === '' || body?.salary == null ? NaN : Number(body.salary);
    const upiVpa = typeof body?.upiVpa === 'string' ? body.upiVpa.trim().toLowerCase() : '';
    if (!name || name.length > 100) return { error: 'Teacher name is required and must be 100 characters or fewer.' };
    if (!subject || subject.length > 100) return { error: 'Subject is required and must be 100 characters or fewer.' };
    if (!language || language.length > 80) return { error: 'Language is required and must be 80 characters or fewer.' };
    if (!Number.isFinite(salary) || salary < 0) return { error: 'Salary must be a non-negative number.' };
    if (upiVpa && !/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(upiVpa)) {
        return { error: 'Enter a valid teacher UPI ID, such as name@bank.' };
    }
    return { value: { name, subject, language, salary, upiVpa } };
}

async function getTeachers(req, res) {
    try {
        return res.json(await Teacher.find().sort({ name: 1 }).lean());
    } catch (error) {
        console.error('Could not load teacher profiles:', error);
        return res.status(500).json({ error: 'Could not load teachers.' });
    }
}

async function getAdminTeachers(req, res) {
    try {
        const teachers = await Teacher.find()
            .select('+upiVpa +salaryPayments')
            .sort({ name: 1 })
            .lean();
        return res.json(teachers);
    } catch (error) {
        console.error('Could not load teacher payout details:', error);
        return res.status(500).json({ error: 'Could not load teacher payout details.' });
    }
}

async function createTeacher(req, res) {
    const validation = validateTeacher(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    try {
        return res.status(201).json(await Teacher.create(validation.value));
    } catch (error) {
        console.error('Could not create teacher profile:', error);
        return res.status(500).json({ error: 'Could not add the teacher.' });
    }
}

async function updateTeacher(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid teacher ID.' });
    const validation = validateTeacher(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });
    try {
        const teacher = await Teacher.findByIdAndUpdate(req.params.id, validation.value, { returnDocument: 'after', runValidators: true });
        if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
        return res.json(teacher);
    } catch (error) {
        console.error('Could not update teacher profile:', error);
        return res.status(500).json({ error: 'Could not update the teacher.' });
    }
}

async function deleteTeacher(req, res) {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid teacher ID.' });
    try {
        const teacher = await Teacher.findByIdAndDelete(req.params.id);
        if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
        return res.json({ message: 'Teacher removed.' });
    } catch (error) {
        console.error('Could not remove teacher profile:', error);
        return res.status(500).json({ error: 'Could not remove the teacher.' });
    }
}

async function recordTeacherSalaryPayout(req, res) {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid teacher ID.' });

    const month = typeof req.body?.month === 'string' ? req.body.month.trim() : '';
    const utr = typeof req.body?.utr === 'string' ? req.body.utr.trim().toUpperCase() : '';
    const amountInput = req.body?.amount;
    const amountText = typeof amountInput === 'number' || (typeof amountInput === 'string' && amountInput.trim() !== '')
        ? String(amountInput).trim()
        : '';
    const amount = amountText ? Number(amountText) : NaN;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
        return res.status(400).json({ error: 'Choose a valid salary month.' });
    }
    if (!/^[A-Z0-9/-]{6,80}$/.test(utr)) {
        return res.status(400).json({ error: 'Enter a valid UPI transaction reference (6–80 letters, numbers, / or -).' });
    }
    if (!Number.isFinite(amount) || amount <= 0 || !/^\d+(?:\.\d{1,2})?$/.test(amountText)) {
        return res.status(400).json({ error: 'Enter a valid salary amount with up to two decimal places.' });
    }

    try {
        const teacher = await Teacher.findById(id).select('+upiVpa +salaryPayments').lean();
        if (!teacher) return res.status(404).json({ error: 'Teacher not found.' });
        if (!teacher.upiVpa || !/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(teacher.upiVpa)) {
            return res.status(400).json({ error: 'Add a valid UPI ID to this teacher profile before recording a payout.' });
        }
        if (Math.round(amount * 100) !== Math.round(teacher.salary * 100)) {
            return res.status(400).json({ error: 'The payout amount must match the teacher’s current monthly salary.' });
        }

        const payout = {
            month,
            amount: teacher.salary,
            utr,
            paidAt: new Date(),
            paidBy: new mongoose.Types.ObjectId(req.auth.userId)
        };
        const updatedTeacher = await Teacher.findOneAndUpdate(
            {
                _id: id,
                salary: teacher.salary,
                'salaryPayments.month': { $ne: month },
                'salaryPayments.utr': { $ne: utr }
            },
            { $push: { salaryPayments: payout } },
            { returnDocument: 'after', runValidators: true }
        ).select('+salaryPayments');

        if (!updatedTeacher) {
            const latestTeacher = await Teacher.findById(id).select('+salaryPayments').lean();
            if (!latestTeacher) return res.status(404).json({ error: 'Teacher not found.' });
            if (latestTeacher.salary !== teacher.salary) {
                return res.status(409).json({ error: 'The teacher salary changed. Refresh and prepare the payout again.' });
            }
            if (latestTeacher.salaryPayments.some((payment) => payment.month === month)) {
                return res.status(409).json({ error: 'A salary payout is already recorded for this month.' });
            }
            return res.status(409).json({ error: 'This transaction reference has already been recorded.' });
        }

        const recordedPayout = updatedTeacher.salaryPayments.find((payment) => payment.month === month);
        return res.status(201).json({
            message: `Salary payout recorded for ${month}.`,
            payout: {
                _id: recordedPayout._id,
                month: recordedPayout.month,
                amount: recordedPayout.amount,
                utr: recordedPayout.utr,
                paidAt: recordedPayout.paidAt
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'This transaction reference has already been recorded.' });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Check the payout month, salary amount, and transaction reference.' });
        }
        console.error('Could not record teacher salary payout:', error);
        return res.status(500).json({ error: 'Could not record the teacher salary payout.' });
    }
}

module.exports = {
    getTeachers,
    getAdminTeachers,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    recordTeacherSalaryPayout
};
