import { useEffect, useState } from 'react';
import { Autorenew, EmailOutlined, Send } from '@mui/icons-material';
import { apiRequest } from '../api.js';
import './Enquiries.css';

const TOPIC_LABELS = {
    courses: 'Courses',
    batches: 'Batches and classes',
    account: 'Account help',
    other: 'Something else'
};

function formatDate(value) {
    return new Date(value).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
    });
}

const Enquiries = () => {
    const [enquiries, setEnquiries] = useState([]);
    const [selectedId, setSelectedId] = useState('');
    const [reply, setReply] = useState('');
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [isResendingLink, setIsResendingLink] = useState(false);

    async function loadEnquiries() {
        setError('');
        try {
            const result = await apiRequest('/enquiries/admin');
            setEnquiries(result);
            setSelectedId((current) => current && result.some((item) => item.id === current)
                ? current
                : result[0]?.id || '');
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Could not load enquiries.');
        } finally {
            setIsLoading(false);
        }
    }

    useEffect(() => {
        let isMounted = true;
        apiRequest('/enquiries/admin')
            .then((result) => {
                if (!isMounted) return;
                setEnquiries(result);
                setSelectedId(result[0]?.id || '');
            })
            .catch((loadError) => {
                if (isMounted) setError(loadError instanceof Error ? loadError.message : 'Could not load enquiries.');
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    const selected = enquiries.find((enquiry) => enquiry.id === selectedId);

    async function handleReply(event) {
        event.preventDefault();
        if (!selected || !reply.trim()) return;
        setError('');
        setStatus('');
        setIsSending(true);
        try {
            const result = await apiRequest(`/enquiries/admin/${selected.id}/messages`, {
                method: 'POST',
                body: JSON.stringify({ message: reply })
            });
            setEnquiries((current) => current.map((item) => item.id === selected.id ? result.enquiry : item)
                .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt)));
            setReply('');
            setStatus(result.notificationSent
                ? 'Reply sent and an email notification was delivered.'
                : 'Reply saved, but the candidate could not be notified by email.');
        } catch (replyError) {
            setError(replyError instanceof Error ? replyError.message : 'Could not save your reply.');
        } finally {
            setIsSending(false);
        }
    }

    async function handleResendLink() {
        if (!selected) return;
        setError('');
        setStatus('');
        setIsResendingLink(true);
        try {
            const result = await apiRequest(`/enquiries/admin/${selected.id}/access-link`, { method: 'POST' });
            setStatus(result.message || 'Conversation link sent.');
            await loadEnquiries();
        } catch (resendError) {
            setError(resendError instanceof Error ? resendError.message : 'Could not resend the conversation link.');
        } finally {
            setIsResendingLink(false);
        }
    }

    return (
        <section className="admin-enquiries" id="enquiries">
            <div className="admin-enquiries-heading">
                <div>
                    <h2><span className="section-icon icon-blue"><EmailOutlined /></span>Enquiries</h2>
                    <p>Read new enquiries and continue the conversation with candidates.</p>
                </div>
                <button className="enquiry-refresh-button" type="button" onClick={loadEnquiries} disabled={isLoading} aria-label="Refresh enquiries">
                    <Autorenew /> Refresh
                </button>
            </div>
            {error && <p className="enquiry-admin-error" role="alert">{error}</p>}
            <div className="enquiry-inbox">
                <aside className="enquiry-list" aria-label="Enquiry list">
                    {isLoading && <p className="enquiry-empty">Loading enquiries…</p>}
                    {!isLoading && enquiries.length === 0 && <p className="enquiry-empty">No enquiries yet. New submissions will appear here.</p>}
                    {enquiries.map((enquiry) => {
                        const latestMessage = enquiry.messages[enquiry.messages.length - 1];
                        return (
                            <button
                                className={`enquiry-list-item${selectedId === enquiry.id ? ' is-selected' : ''}`}
                                key={enquiry.id}
                                type="button"
                                onClick={() => {
                                    setSelectedId(enquiry.id);
                                    setStatus('');
                                    setError('');
                                }}
                            >
                                <span className="enquiry-list-item-top"><strong>{enquiry.name}</strong><time>{formatDate(enquiry.updatedAt)}</time></span>
                                <span className="enquiry-list-item-topic">{TOPIC_LABELS[enquiry.topic] || enquiry.topic}</span>
                                <span className="enquiry-list-item-preview">{latestMessage?.message}</span>
                            </button>
                        );
                    })}
                </aside>
                {selected ? (
                    <div className="enquiry-thread">
                        <header className="enquiry-thread-header">
                            <div>
                                <h3>{selected.name}</h3>
                                <a href={`mailto:${selected.email}`}>{selected.email}</a>
                                <span>{TOPIC_LABELS[selected.topic] || selected.topic} · Received {formatDate(selected.createdAt)}</span>
                            </div>
                            <button className="enquiry-send-link-button" type="button" onClick={handleResendLink} disabled={isResendingLink}>
                                <EmailOutlined /> {isResendingLink ? 'Sending…' : 'Email chat link'}
                            </button>
                        </header>
                        <div className="enquiry-thread-messages" aria-live="polite">
                            {selected.messages.map((entry) => (
                                <article className={`enquiry-thread-message enquiry-thread-message--${entry.sender}`} key={entry._id}>
                                    <span>{entry.sender === 'admin' ? 'You' : selected.name}<time>{formatDate(entry.createdAt)}</time></span>
                                    <p>{entry.message}</p>
                                </article>
                            ))}
                        </div>
                        <form className="enquiry-reply-form" onSubmit={handleReply}>
                            <label htmlFor="enquiry-admin-reply">Reply to {selected.name}
                                <textarea id="enquiry-admin-reply" rows={4} maxLength={2000} value={reply} onChange={(event) => setReply(event.target.value)} required />
                            </label>
                            <div>
                                <span>{reply.length}/2,000 characters</span>
                                <button type="submit" disabled={isSending || !reply.trim()}><Send /> {isSending ? 'Sending…' : 'Send reply'}</button>
                            </div>
                        </form>
                    </div>
                ) : (
                    !isLoading && enquiries.length > 0 && <p className="enquiry-empty enquiry-thread-placeholder">Select an enquiry to read and reply.</p>
                )}
            </div>
            {status && <p className="enquiry-admin-status" role="status">{status}</p>}
        </section>
    );
};

export default Enquiries;
