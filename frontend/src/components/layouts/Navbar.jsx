import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AccountCircle, ArrowForward, MoreVert } from '@mui/icons-material';
import ThemeToggle from '../ThemeToggle.jsx';
import { useAuth } from '../auth-context.js';

const Navbar = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        if (!menuOpen) return undefined;

        function closeMenu(event) {
            if (event.key === 'Escape' || !menuRef.current?.contains(event.target)) {
                setMenuOpen(false);
            }
        }

        document.addEventListener('keydown', closeMenu);
        document.addEventListener('pointerdown', closeMenu);
        return () => {
            document.removeEventListener('keydown', closeMenu);
            document.removeEventListener('pointerdown', closeMenu);
        };
    }, [menuOpen]);

    function handleSignOut() {
        signOut();
        setMenuOpen(false);
        navigate('/', { replace: true });
    }

    return (
        <>
            <Link className="nav-secondary" to="/">Home</Link>
            <Link className="nav-secondary" to="/about">About</Link>
            <Link className="nav-secondary" to="/allbatches">Batch</Link>
            <Link className="nav-secondary" to="/allcourses">Courses</Link>
            <Link className="nav-secondary" to="/notes">Notes</Link>
            <Link className="nav-featured" to="/play-arena">Play Arena</Link>
            <Link className="nav-secondary" to="/contact">Contact</Link>
            <Link className="nav-enquiry" to="/contact#send-enquiry">Enquiry <ArrowForward /></Link>
            {user ? (
                <div className="account-actions">
                    <Link className="profile-link" to={`/${user.role}`} aria-label={`${user.username}'s profile`} title={`${user.username}'s profile`}>
                        <AccountCircle />
                    </Link>
                    <div className="account-menu" ref={menuRef}>
                        <button className="account-menu-toggle" type="button" aria-label="Open account menu" aria-expanded={menuOpen} aria-controls="account-menu-options" onClick={() => setMenuOpen((open) => !open)}>
                            <MoreVert />
                        </button>
                        {menuOpen && (
                            <div className="account-menu-options" id="account-menu-options">
                                <span className="account-menu-username">{user.username}</span>
                                <button type="button" onClick={handleSignOut}>Logout</button>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <>
                    <Link className="nav-login" to="/login">Sign in</Link>
                    <Link className="nav-register" to="/register">Get started <ArrowForward /></Link>
                </>
            )}
            <ThemeToggle />
        </>
    );
};

export default Navbar;
