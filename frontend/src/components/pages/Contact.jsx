import { useState } from 'react';
import { ArrowForward, AutoStories, EmailOutlined, Lightbulb, School } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import Navbar from '../layouts/Navbar.jsx';
import { API_BASE } from '../api.js';
import './InfoPages.css';

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL;

const Contact = () => {
    const [form, setForm] = useState({ name: '', email: '', topic: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');

    async function handleSubmit(event) {
        event.preventDefault();
        setError('');
        setStatus('');
        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_BASE}/enquiries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Could not send your enquiry.');
            setForm({ name: '', email: '', topic: '', message: '' });
            setStatus(result.message || 'Your enquiry was received.');
        } catch (submitError) {
            setError(submitError instanceof Error ? submitError.message : 'Could not send your enquiry. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
      <main className="info-page contact-page">
        <nav className="site-nav" aria-label="Main navigation">
            <Link className="brand" to="/" aria-label="BrightPath home">
                <span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span>
                <span>Bright<span className="brand-accent">Path</span></span>
            </Link>
            <div className="site-nav-links"><Navbar /></div>
        </nav>

        <section className="contact-hero">
            <div>
                <p className="eyebrow"><span className="eyebrow-dot" /> WE’RE HERE TO HELP</p>
                <h1>A question is a <span>great place to start.</span></h1>
                <p>Whether you’re finding your way around BrightPath or choosing what to learn next, here are a few helpful places to begin.</p>
            </div>
            <div className="contact-hero-badge" aria-hidden="true">
                <span><Lightbulb /></span>
                <p>Every good journey<br />starts with a question.</p>
            </div>
        </section>

        <section className="contact-options" aria-label="Ways to get help">
            <article className="contact-option">
                <span className="contact-option-icon contact-icon-violet"><School /></span>
                <p className="course-number">COURSES & CLASSES</p>
                <h2>Looking for your next class?</h2>
                <p>Browse available courses and batches to find a learning path that fits what you’re curious about.</p>
                <div className="contact-option-links">
                    <Link to="/allcourses">Browse courses <ArrowForward /></Link>
                    <Link to="/allbatches">See batches <ArrowForward /></Link>
                </div>
            </article>
            <article className="contact-option">
                <span className="contact-option-icon contact-icon-peach"><AutoStories /></span>
                <p className="course-number">ACCOUNT & ACCESS</p>
                <h2>Need a hand with your account?</h2>
                <p>Sign in to your learning space. If you can’t access your account, ask your BrightPath administrator for help.</p>
                <div className="contact-option-links">
                    <Link to="/login">Go to sign in <ArrowForward /></Link>
                    <Link to="/register">Create an account <ArrowForward /></Link>
                </div>
            </article>
            <article className="contact-option contact-email-option">
                <span className="contact-option-icon contact-icon-mint"><EmailOutlined /></span>
                <p className="course-number">GET IN TOUCH</p>
                <h2>Prefer to send us a note?</h2>
                {contactEmail ? (
                    <>
                        <p>Send your question by email or use the enquiry form to start a private conversation.</p>
                        <a className="contact-email-link" href={`mailto:${contactEmail}`}>{contactEmail} <ArrowForward /></a>
                        <Link className="contact-email-link" to="#send-enquiry">Write an enquiry <ArrowForward /></Link>
                    </>
                ) : (
                    <>
                        <p>A general contact email has not been configured yet. Send an enquiry here to start a private conversation.</p>
                        <Link className="contact-email-link" to="#send-enquiry">Write an enquiry <ArrowForward /></Link>
                    </>
                )}
            </article>
        </section>

        <section className="contact-enquiry" id="send-enquiry">
            <div className="contact-enquiry-heading">
                <p className="eyebrow">SEND US AN ENQUIRY</p>
                <h2>Tell us what’s on your mind.</h2>
                <p>We’ll email you a private link where you can follow up and chat with the BrightPath team.</p>
            </div>
            <form className="contact-enquiry-form" onSubmit={handleSubmit}>
                <div className="contact-form-row">
                    <label htmlFor="enquiry-name">Your name
                        <input id="enquiry-name" name="name" autoComplete="name" minLength={2} maxLength={80} value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
                    </label>
                    <label htmlFor="enquiry-email">Email address
                        <input id="enquiry-email" name="email" type="email" autoComplete="email" maxLength={254} value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} required />
                    </label>
                </div>
                <label htmlFor="enquiry-topic">What can we help with?
                    <select id="enquiry-topic" name="topic" value={form.topic} onChange={(event) => setForm((current) => ({ ...current, topic: event.target.value }))} required>
                        <option value="" disabled>Choose a topic</option>
                        <option value="courses">Courses</option>
                        <option value="batches">Batches and classes</option>
                        <option value="account">Account help</option>
                        <option value="other">Something else</option>
                    </select>
                </label>
                <label htmlFor="enquiry-message">Your message
                    <textarea id="enquiry-message" name="message" rows={5} minLength={10} maxLength={2000} placeholder="Share a little detail so we can point you in the right direction." value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required />
                    <span className="contact-form-hint">{form.message.length}/2,000 characters</span>
                </label>
                <button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Sending enquiry…' : 'Send enquiry'} <ArrowForward /></button>
                {error && <p className="contact-form-error" role="alert">{error}</p>}
                {status && <p className="contact-form-status" role="status">{status}</p>}
            </form>
        </section>

        <section className="contact-faq">
            <div className="contact-faq-heading">
                <p className="eyebrow">A FEW QUICK ANSWERS</p>
                <h2>Before you reach out</h2>
                <p>These shortcuts may help you find what you need.</p>
            </div>
            <div className="contact-faq-list">
                <details>
                    <summary>Where can I see the available courses?</summary>
                    <p>Visit <Link to="/allcourses">All courses</Link> to explore what’s available on BrightPath.</p>
                </details>
                <details>
                    <summary>Where can I find study resources?</summary>
                    <p>Browse <Link to="/notes">study notes</Link> or take a short practice break in the <Link to="/play-arena">Play Arena</Link>.</p>
                </details>
                <details>
                    <summary>What should I do if I forgot my password or PIN?</summary>
                    <p>Use the recovery guidance on the <Link to="/login">sign-in page</Link>, or contact your BrightPath administrator for help.</p>
                </details>
            </div>
        </section>

        <footer className="site-footer">
            <Link className="brand" to="/"><span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span><span>Bright<span className="brand-accent">Path</span></span></Link>
            <p>Small steps. Bright futures.</p>
            <Link to="/about">Get to know BrightPath <ArrowForward /></Link>
        </footer>
      </main>
    );
};

export default Contact;
