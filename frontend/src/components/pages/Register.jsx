import { LockOpen, PersonOutlineOutlined, EmailOutlined, LockOutlined, SchoolOutlined, Visibility, VisibilityOff } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ThemeToggle from '../ThemeToggle.jsx';
import { API_BASE, apiRequest } from '../api.js';
import ForgotPasswordHelp from '../ForgotPasswordHelp.jsx';
import './Login.css';

const Register = () => {
    const [form, setForm] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: '',
        adminRegistrationCode: '',
        wantsTuition: false,
        tuitionClass: '',
        tuitionCourseIds: []
    });
    const [courses, setCourses] = useState([]);
    const [isLoadingCourses, setIsLoadingCourses] = useState(false);
    const [courseLoadError, setCourseLoadError] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [passwordVisibility, setPasswordVisibility] = useState({
        adminRegistrationCode: false,
        password: false,
        confirmPassword: false
    });

    useEffect(() => {
        if (form.role !== 'student' || !form.wantsTuition) return undefined;

        let isMounted = true;
        apiRequest('/allcourses')
            .then((result) => {
                if (isMounted) setCourses(result);
            })
            .catch((requestError) => {
                if (isMounted) setCourseLoadError(requestError.message);
            })
            .finally(() => {
                if (isMounted) setIsLoadingCourses(false);
            });

        return () => {
            isMounted = false;
        };
    }, [form.role, form.wantsTuition]);

    function togglePasswordVisibility(field) {
        setPasswordVisibility((current) => ({ ...current, [field]: !current[field] }));
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setSuccess('');

        const username = form.username.trim();
        const email = form.email.trim();
        if (username.length < 3) {
            setError('Username must be at least 3 characters long.');
            return;
        }
        if (form.password.length < 8) {
            setError('Password must be at least 8 characters long.');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (form.role === 'student' && form.wantsTuition
            && (!form.tuitionClass.trim() || form.tuitionCourseIds.length === 0)) {
            setError('Enter your class and select at least one course for your tuition request.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password: form.password,
                    role: form.role,
                    adminRegistrationCode: form.adminRegistrationCode,
                    ...(form.role === 'student' && form.wantsTuition ? {
                        tuitionClass: form.tuitionClass,
                        tuitionCourseIds: form.tuitionCourseIds
                    } : {})
                })
            });
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(response.ok
                    ? 'The server returned an unexpected response.'
                    : `Could not create your account (HTTP ${response.status}). Check that the backend is running.`);
            }

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Could not create your account.');
            }

            setForm({
                username: '',
                email: '',
                password: '',
                confirmPassword: '',
                role: '',
                adminRegistrationCode: '',
                wantsTuition: false,
                tuitionClass: '',
                tuitionCourseIds: []
            });
            setSuccess(result.message || 'Account created. You can now sign in.');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to create your account. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return(
        <div className="login-page register-page">
            <div className="auth-topbar">
                <Link className="auth-brand" to="/"><span className="auth-brand-logo"><img src="/assests/logo1.jpeg" alt="" /></span>Bright<span>Path</span></Link>
                <ThemeToggle />
            </div>
            <div className="auth-card">
                <header className="auth-heading">
                    <span className="auth-heading-icon register-heading-icon"><LockOpen /></span>
                    <p className="auth-eyebrow">YOUR NEXT CHAPTER</p>
                    <h1>Make a little room to grow.</h1>
                    <p>Create your account and start learning with BrightPath.</p>
                </header>
                <form onSubmit={handleSubmit}>
                    <label htmlFor="register-name">Username
                        <span className="auth-input-wrap"><PersonOutlineOutlined /><input type="text" id="register-name" name="username" placeholder="Choose a username" autoComplete="username" minLength={3} maxLength={32} value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required /></span>
                    </label>
                    <label htmlFor="register-email">Email address
                        <span className="auth-input-wrap"><EmailOutlined /><input type="email" id="register-email" name="email" placeholder="you@example.com" autoComplete="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required /></span>
                    </label>
                    <label htmlFor="register-role">Account type
                        <span className="auth-input-wrap auth-select-wrap"><SchoolOutlined />
                            <select id="register-role" name="role" value={form.role} onChange={(event) => setForm((current) => ({
                                ...current,
                                role: event.target.value,
                                adminRegistrationCode: '',
                                wantsTuition: false,
                                tuitionClass: '',
                                tuitionCourseIds: []
                            }))} required>
                                <option value="" disabled>Select your role</option>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </span>
                    </label>
                    {form.role === 'student' && (
                        <fieldset className="registration-tuition">
                            <legend>Tuition request</legend>
                            <p className="registration-tuition-question">Would you like to request tuition?</p>
                            <div className="registration-tuition-options">
                                {[
                                    { value: true, label: 'Yes, I want tuition' },
                                    { value: false, label: 'No, not right now' }
                                ].map((option) => (
                                    <label className="registration-tuition-opt-in" key={option.label}>
                                        <input
                                            type="radio"
                                            name="wantsTuition"
                                            value={String(option.value)}
                                            checked={form.wantsTuition === option.value}
                                            onChange={() => {
                                                setIsLoadingCourses(option.value);
                                                setCourseLoadError('');
                                                setForm((current) => ({
                                                    ...current,
                                                    wantsTuition: option.value,
                                                    tuitionClass: option.value ? current.tuitionClass : '',
                                                    tuitionCourseIds: option.value ? current.tuitionCourseIds : []
                                                }));
                                            }}
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                            {form.wantsTuition && (
                                <>
                                    <label htmlFor="tuition-class">Your class
                                        <input
                                            className="registration-tuition-class"
                                            type="text"
                                            id="tuition-class"
                                            maxLength={80}
                                            placeholder="e.g. Class 10"
                                            value={form.tuitionClass}
                                            onChange={(event) => setForm((current) => ({ ...current, tuitionClass: event.target.value }))}
                                            required
                                        />
                                    </label>
                                    <div className="registration-tuition-courses">
                                        <p>Select the courses you want tuition for</p>
                                        {isLoadingCourses ? <span>Loading courses…</span> : courseLoadError ? (
                                            <span className="registration-tuition-error" role="alert">{courseLoadError}</span>
                                        ) : courses.length === 0 ? <span>No courses are available yet.</span> : courses.map((course) => (
                                            <label key={course._id}>
                                                <input
                                                    type="checkbox"
                                                    checked={form.tuitionCourseIds.includes(course._id)}
                                                    onChange={(event) => setForm((current) => ({
                                                        ...current,
                                                        tuitionCourseIds: event.target.checked
                                                            ? [...current.tuitionCourseIds, course._id]
                                                            : current.tuitionCourseIds.filter((id) => id !== course._id)
                                                    }))}
                                                />
                                                <span>{course.course_name}{course.course_class ? ` · ${course.course_class}` : ''}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="registration-tuition-note">Your selected courses will be sent to the administrator for review. Enrollment and any required payment happen separately.</p>
                                </>
                            )}
                        </fieldset>
                    )}
                    {form.role === 'admin' && (
                        <label htmlFor="admin-registration-code">Admin registration code
                            <span className="auth-input-wrap"><LockOutlined /><input type={passwordVisibility.adminRegistrationCode ? 'text' : 'password'} id="admin-registration-code" name="adminRegistrationCode" autoComplete="off" value={form.adminRegistrationCode} onChange={(event) => setForm((current) => ({ ...current, adminRegistrationCode: event.target.value }))} required />
                                <button className="password-visibility-toggle" type="button" aria-label={passwordVisibility.adminRegistrationCode ? 'Hide admin registration code' : 'Show admin registration code'} aria-pressed={passwordVisibility.adminRegistrationCode} onClick={() => togglePasswordVisibility('adminRegistrationCode')}>
                                    {passwordVisibility.adminRegistrationCode ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </span>
                        </label>
                    )}
                    <label htmlFor="register-password">Password
                        <span className="auth-input-wrap"><LockOutlined /><input type={passwordVisibility.password ? 'text' : 'password'} id="register-password" name="password" placeholder="Create a password (at least 8 characters)" autoComplete="new-password" minLength={8} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} required />
                            <button className="password-visibility-toggle" type="button" aria-label={passwordVisibility.password ? 'Hide password' : 'Show password'} aria-pressed={passwordVisibility.password} onClick={() => togglePasswordVisibility('password')}>
                                {passwordVisibility.password ? <VisibilityOff /> : <Visibility />}
                            </button>
                        </span>
                    </label>
                    <label htmlFor="register-confirm-password">Confirm password
                        <span className="auth-input-wrap"><LockOutlined /><input type={passwordVisibility.confirmPassword ? 'text' : 'password'} id="register-confirm-password" name="confirmPassword" placeholder="Enter your password again" autoComplete="new-password" minLength={8} value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} required />
                            <button className="password-visibility-toggle" type="button" aria-label={passwordVisibility.confirmPassword ? 'Hide confirm password' : 'Show confirm password'} aria-pressed={passwordVisibility.confirmPassword} onClick={() => togglePasswordVisibility('confirmPassword')}>
                                {passwordVisibility.confirmPassword ? <VisibilityOff /> : <Visibility />}
                            </button>
                        </span>
                    </label>
                    <ForgotPasswordHelp />
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Creating account…' : 'Create account'} <LockOpen />
                    </button>
                </form>
                {error && <p role="alert">{error}</p>}
                {success && <p role="status">{success} <Link to="/login">Sign in <span aria-hidden="true">→</span></Link></p>}
                {!success && <p className="auth-switch">Already have an account? <Link to="/login">Sign in <span aria-hidden="true">→</span></Link></p>}
            </div>
            <p className="auth-footer">A brighter way to learn, one step at a time.</p>
        </div>
    )
}
 
export default Register