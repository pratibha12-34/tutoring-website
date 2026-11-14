const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Register',
        required: true
    },
    itemType: {
        type: String,
        enum: ['course', 'batch'],
        required: true
    },
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    coursePaymentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CoursePayment',
        default: null
    },
    enrolledAt: {
        type: Date,
        default: Date.now
    }
});

enrollmentSchema.index({ studentId: 1, itemType: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
