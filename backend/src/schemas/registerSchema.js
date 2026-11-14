const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USER_ROLES = ['admin', 'student', 'teacher'];

function validateRegistration(data) {
    const username = typeof data?.username === 'string' ? data.username.trim() : '';
    const email = typeof data?.email === 'string' ? data.email.trim().toLowerCase() : '';
    const password = typeof data?.password === 'string' ? data.password : '';
    const role = typeof data?.role === 'string' ? data.role : '';
    const tuitionClass = typeof data?.tuitionClass === 'string' ? data.tuitionClass.trim() : '';
    const tuitionCourseIds = data?.tuitionCourseIds;

    if (username.length < 3 || username.length > 32) {
        return { error: 'Username must be between 3 and 32 characters long.' };
    }
    if (!EMAIL_PATTERN.test(email)) {
        return { error: 'Enter a valid email address.' };
    }
    if (password.length < 8) {
        return { error: 'Password must be at least 8 characters long.' };
    }
    if (!USER_ROLES.includes(role)) {
        return { error: 'Choose a valid account role.' };
    }
    if (role === 'student' && tuitionCourseIds !== undefined) {
        if (!Array.isArray(tuitionCourseIds) || tuitionCourseIds.length === 0 || tuitionCourseIds.length > 50) {
            return { error: 'Select at least one course for your tuition request.' };
        }
        if (tuitionClass.length < 1 || tuitionClass.length > 80) {
            return { error: 'Enter your class (up to 80 characters) for the tuition request.' };
        }
        if (tuitionCourseIds.some((id) => typeof id !== 'string')) {
            return { error: 'Choose valid courses for your tuition request.' };
        }
    }

    return {
        value: {
            username,
            email,
            password,
            role,
            ...(role === 'student' && tuitionCourseIds !== undefined ? { tuitionClass, tuitionCourseIds } : {})
        }
    };
}

module.exports = { validateRegistration };
