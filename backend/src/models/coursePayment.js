const mongoose = require('mongoose');

const coursePaymentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        required: true
    },
    itemType: {
        type: String,
        enum: ['course', 'batch'],
        default: 'course',
        required: true
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        default: null
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        default: null
    },
    amount: {
        type: Number,
        required: true,
        min: 0.01
    },
    utr: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
        minlength: 6,
        maxlength: 80
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
        required: true
    },
    submittedAt: {
        type: Date,
        default: Date.now,
        required: true
    },
    reviewedAt: {
        type: Date,
        default: null
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        default: null
    }
}, { timestamps: true });

coursePaymentSchema.index({ utr: 1 }, { unique: true });
coursePaymentSchema.index({ studentId: 1, itemType: 1, courseId: 1, batchId: 1, status: 1 });

module.exports = mongoose.model('CoursePayment', coursePaymentSchema);
