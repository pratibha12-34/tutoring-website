function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

async function hasApprovedEnrollment(studentId, itemType, itemId) {
    const Enrollment = require('../models/enrollment');
    const CoursePayment = require('../models/coursePayment');
    const enrollment = await Enrollment.findOne({ studentId, itemType, itemId })
        .select('coursePaymentId')
        .lean();

    if (!enrollment) return false;
    if (!enrollment.coursePaymentId) return true;

    const paymentItemField = itemType === 'course' ? 'courseId' : 'batchId';
    return Boolean(await CoursePayment.exists({
        _id: enrollment.coursePaymentId,
        studentId,
        itemType,
        [paymentItemField]: itemId,
        status: 'verified'
    }));
}

module.exports = { isHttpUrl, hasApprovedEnrollment };
