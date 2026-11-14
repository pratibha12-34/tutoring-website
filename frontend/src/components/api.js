const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.DEV ? 'http://localhost:5000' : '/api');
const AUTH_STORAGE_KEY = 'brightpath-auth';

export async function apiRequest(path, options = {}) {
    const storedAuth = window.localStorage.getItem(AUTH_STORAGE_KEY);
    let token = '';
    if (storedAuth) {
        try {
            token = JSON.parse(storedAuth).token || '';
        } catch {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            throw new Error('Saved sign-in data is invalid. Sign in again.');
        }
    }

    const headers = new Headers(options.headers || {});
    if (token) headers.set('Authorization', `Bearer ${token}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');

    let response;
    try {
        response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    } catch {
        throw new Error('Could not reach the server. Check that the backend is running.');
    }

    const contentType = response.headers.get('content-type') || '';
    const result = contentType.includes('application/json')
        ? await response.json()
        : null;
    if (!response.ok) {
        if (response.status === 401 && token) {
            window.localStorage.removeItem(AUTH_STORAGE_KEY);
            window.dispatchEvent(new CustomEvent('brightpath-auth-expired'));
        }
        throw new Error(result?.error || `Request failed (HTTP ${response.status}).`);
    }
    if (!result && response.status !== 204) {
        throw new Error('The server returned an unexpected response.');
    }
    return result;
}

export { API_BASE };
