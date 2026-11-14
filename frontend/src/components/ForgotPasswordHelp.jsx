import './ForgotPasswordHelp.css';

const ForgotPasswordHelp = ({ label = 'Forgot password?', credential = 'password' }) => (
    <details className="forgot-password-help">
        <summary>{label}</summary>
        <p>Self-service recovery is not available yet. Contact your BrightPath administrator to reset your {credential}.</p>
    </details>
);

export default ForgotPasswordHelp;
