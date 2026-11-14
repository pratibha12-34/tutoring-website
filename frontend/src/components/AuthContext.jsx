import { useCallback, useEffect, useState } from 'react';
import { AuthContext } from './auth-context.js';

const AUTH_STORAGE_KEY = 'brightpath-auth';
const VALID_ROLES = ['admin', 'teacher', 'student'];

function readStoredUser() {
    const storedUser = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!storedUser) return null;

    try {
        const user = JSON.parse(storedUser);
        if (typeof user.username === 'string' && VALID_ROLES.includes(user.role) && typeof user.token === 'string') {
            return { username: user.username, role: user.role, token: user.token };
        }
    } catch (error) {
        console.error('Could not read the saved BrightPath account:', error);
    }

    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(readStoredUser);

    const signIn = useCallback((authenticatedUser) => {
        const savedUser = {
            username: authenticatedUser.username,
            role: authenticatedUser.role,
            token: authenticatedUser.token
        };
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(savedUser));
        setUser(savedUser);
    }, []);

    const signOut = useCallback(() => {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
    }, []);

    useEffect(() => {
        function syncAccount(event) {
            if (event.key === AUTH_STORAGE_KEY) {
                setUser(readStoredUser());
            }
        }

        function expireAccount() {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            setUser(null);
        }

        window.addEventListener('storage', syncAccount);
        window.addEventListener('brightpath-auth-expired', expireAccount);
        return () => {
            window.removeEventListener('storage', syncAccount);
            window.removeEventListener('brightpath-auth-expired', expireAccount);
        };
    }, []);

    return (
        <AuthContext.Provider value={{ user, signIn, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}
