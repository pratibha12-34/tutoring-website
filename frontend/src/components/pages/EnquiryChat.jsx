import { useCallback, useEffect, useState } from 'react';
import { ArrowForward, Autorenew } from '@mui/icons-material';
import { Link, useParams } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle.jsx';
import { API_BASE } from '../api.js';
import './EnquiryChat.css';

function formatMessageTime(value) {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

const EnquiryChat = () => {
    const { token } = useParams();
    const [conversation, setConversation] = useState(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const loadConversation = useCallback(async (signal) => {
        setError('');
        try {
            const response = await fetch(`${API_BASE}/enquiries/chat/${token}`, { signal });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Could not load this conversation.');
            setConversation(result);
        } catch (loadError) {
            if (loadError.name !== 'AbortError') {
                setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.');
            }
        } finally {
            if (!signal?.aborted) setIsLoading(false);
        }
    }, [token]);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`${API_BASE}/enquiries/chat/${token}`, { signal: controller.signal })
            .then(async (response) => {
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Could not load this conversation.');
                setConversation(result);
            })
            .catch((loadError) => {
                if (loadError.name !== 'AbortError') {
                    setError(loadError instanceof Error ? loadError.message : 'Could not load this conversation.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setIsLoading(false);
            });
        return () => controller.abort();
    }, [token]);

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setStatus('');
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/enquiries/chat/${token}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Could not send your message.');
            setConversation(result.enquiry);
            setMessage('');
            setStatus(result.notificationSent
                ? 'Your message was sent to the Garvit team.'
                : 'Your message was saved, but the Garvit team could not be notified by email.');
        } catch (sendError) {
            setError(sendError instanceof Error ? sendError.message : 'Could not send your message.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="enquiry-chat-page">
            <header className="enquiry-chat-topbar">
                <Link className="brand" to="/" aria-label="Garvit home">
                    <span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span>
                    <span>Gar<span className="brand-accent">vit</span></span>
                </Link>
                <ThemeToggle />
            </header>
            <section className="enquiry-chat-card">
                <p className="eyebrow">GARVIT ENQUIRY</p>
                <h1>Your conversation</h1>
                {isLoading ? <p className="enquiry-chat-muted">Loading your conversation…</p> : error && !conversation ? (
                    <p className="enquiry-chat-error" role="alert">{error}</p>
                ) : conversation && (
                    <>
                        <div className="enquiry-chat-summary">
                            <span>Hi {conversation.name}</span>
                            <span>Topic: {conversation.topic}</span>
                        </div>
                        <div className="enquiry-chat-toolbar">
                            <p>Messages between you and the Garvit team.</p>
                            <button type="button" onClick={() => loadConversation()} aria-label="Refresh conversation">
                                <Autorenew /> Refresh
                            </button>
                        </div>
                        <div className="enquiry-chat-messages" aria-live="polite">
                            {conversation.messages.map((entry) => (
                                <article className={`enquiry-chat-message enquiry-chat-message--${entry.sender}`} key={entry._id || `${entry.sender}-${entry.createdAt}`}>
                                    <div className="enquiry-chat-message-meta">
                                        <strong>{entry.sender === 'admin' ? 'Garvit team' : 'You'}</strong>
                                        <time dateTime={entry.createdAt}>{formatMessageTime(entry.createdAt)}</time>
                                    </div>
                                    <p>{entry.message}</p>
                                </article>
                            ))}
                        </div>
                        <form className="enquiry-chat-form" onSubmit={handleSubmit}>
                            <label htmlFor="candidate-reply">Write a reply
                                <textarea id="candidate-reply" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} rows={4} required />
                            </label>
                            <div className="enquiry-chat-form-footer">
                                <span>{message.length}/2,000 characters</span>
                                <button type="submit" disabled={isSubmitting || !message.trim()}>
                                    {isSubmitting ? 'Sending…' : 'Send reply'} <ArrowForward />
                                </button>
                            </div>
                        </form>
                        {error && <p className="enquiry-chat-error" role="alert">{error}</p>}
                        {status && <p className="enquiry-chat-status" role="status">{status}</p>}
                    </>
                )}
            </section>
            <p className="enquiry-chat-privacy">This private link gives access to your enquiry. Keep it to yourself.</p>
        </main>
    );
};

export default EnquiryChat;
