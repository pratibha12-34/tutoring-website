import { LoginRounded, PersonOutlineOutlined, LockOutlined, SchoolOutlined, Visibility, VisibilityOff } from  '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import ThemeToggle from '../ThemeToggle.jsx';
import { useAuth } from '../auth-context.js';
import { API_BASE } from '../api.js';
import ForgotPasswordHelp from '../ForgotPasswordHelp.jsx';
import './Login.css';


const Login = () => {
    const navigate = useNavigate();
    const { signIn } = useAuth();
    const [form,setform] = useState({
        username: '',
        password:'',
        role: 'student'
    });
    const [error, seterror] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    async function handleSubmit(event){
        event.preventDefault();
        await handlelogin(form.username, form.password, form.role);
    }

    async function handlelogin(username, password, role){
        seterror('');
        if (!username.trim() || !password) {
            seterror(`Enter your username and ${role === 'admin' ? 'admin PIN' : 'password'}.`);
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username.trim(), password, role })
            });
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Login failed. Check your username and password.');
            }

            const authenticatedRole = result.user?.role || result.role;
            if (!['admin', 'teacher', 'student'].includes(authenticatedRole)) {
                throw new Error('The server did not return a valid authenticated user role.');
            }

            if (typeof result.token !== 'string' || !result.token) {
                throw new Error('The server did not create a sign-in session. Please try again.');
            }
            signIn({ username: result.user?.username || username.trim(), role: authenticatedRole, token: result.token });
            navigate(`/${authenticatedRole}`);
        } catch (err) {
            seterror(err instanceof Error ? err.message : 'Unable to log in. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }
    
    return(
        <div className="login-page">
            <div className="auth-topbar">
                <Link className="auth-brand" to="/"><span className="auth-brand-logo"><img src="/assests/logo1.jpeg" alt="" /></span>Bright<span>Path</span></Link>
                <ThemeToggle />
            </div>
            <div className="auth-card">
                <header className="auth-heading">
                    <span className="auth-heading-icon login-heading-icon"><LoginRounded /></span>
                    <p className="auth-eyebrow">WELCOME BACK</p>
                    <h1>Pick up where you left off.</h1>
                    <p>Sign in to your tutoring account and keep growing.</p>
                </header>

                <form onSubmit={handleSubmit}>
                   
                    <label htmlFor="name">Username
                        <span className="auth-input-wrap"><PersonOutlineOutlined />
                        <input type="text" placeholder="Enter your username" id="name" name="username" autoComplete="username" value={form.username} onChange={(e) => setform((c) =>({...c, username : e.target.value }))} required /></span>
                    </label>
                    <label htmlFor="roles">Your role
                        <span className="auth-input-wrap auth-select-wrap"><SchoolOutlined />
                            <select id="roles" name="role" value={form.role} onChange={(event) => {
                                setform((current) => ({ ...current, role: event.target.value, password: '' }));
                                setShowPassword(false);
                            }} required>
                                <option value="student">Student</option>
                                <option value="teacher">Teacher</option>
                                <option value="admin">Admin</option>
                            </select>
                        </span>
                    </label>
                    <label htmlFor="password">{form.role === 'admin' ? 'Admin PIN' : 'Password'}
                        <span className="auth-input-wrap"><LockOutlined />
                        <input type={showPassword ? 'text' : 'password'} placeholder={form.role === 'admin' ? 'Enter admin PIN' : 'Enter your password'} id="password" name="password" autoComplete="current-password" inputMode={form.role === 'admin' ? 'numeric' : undefined} value={form.password} onChange={(e) => setform((c) =>({...c, password : e.target.value }))} required />
                        <button className="password-visibility-toggle" type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                        </button></span>
                    </label>
                    <ForgotPasswordHelp
                        label={form.role === 'admin' ? 'Forgot your PIN?' : 'Forgot password?'}
                        credential={form.role === 'admin' ? 'admin PIN' : 'password'}
                    />
                    <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Signing in…' : 'Sign in'} <LoginRounded />
                    </button>
                </form>

                {error && <p role="alert"> {error} </p>}

                <p className="auth-switch">New to BrightPath? <Link to="/register">Create an account <span aria-hidden="true">→</span></Link></p>
            </div>
            <p className="auth-footer">A brighter way to learn, one step at a time.</p>
        </div>
    )
}

export default Login
