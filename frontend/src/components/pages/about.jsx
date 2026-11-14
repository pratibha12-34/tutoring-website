import { ArrowForward, AutoStories, Groups, Lightbulb, School } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import Navbar from '../layouts/Navbar.jsx';
import Seo from '../Seo.jsx';
import './InfoPages.css';

const About = () => (
    <main className="info-page about-page">
        <Seo
            title="About Garvit | Tutoring and Learning"
            description="Learn how Garvit brings tutoring courses, live classes and study resources together to help learners grow."
            canonicalPath="/about"
        />
        <nav className="site-nav" aria-label="Main navigation">
            <Link className="brand" to="/" aria-label="Garvit home">
                <span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span>
                <span>Gar<span className="brand-accent">vit</span></span>
            </Link>
            <div className="site-nav-links"><Navbar /></div>
        </nav>

        <section className="info-hero about-hero">
            <div className="info-hero-copy">
                <p className="eyebrow"><span className="eyebrow-dot" /> A PLACE TO FIND YOUR NEXT STEP</p>
                <h1>Learning is a journey. <span>Let’s make it yours.</span></h1>
                <p>Garvit brings lessons, live learning and helpful study tools together, so learners can build confidence one idea at a time.</p>
                <div className="hero-actions">
                    <Link className="primary-button" to="/register">Start your journey <ArrowForward /></Link>
                    <Link className="text-button" to="/allcourses">Explore courses</Link>
                </div>
            </div>
            <div className="about-hero-art" aria-hidden="true">
                <div className="about-orbit" />
                <div className="about-note about-note-top"><Lightbulb /><span>Stay curious</span></div>
                <div className="about-book-card">
                    <span className="about-book-icon"><AutoStories /></span>
                    <span className="about-book-kicker">YOUR LEARNING SPACE</span>
                    <strong>Small steps add up.</strong>
                    <span className="about-book-line"><i /></span>
                    <span className="about-book-caption">Learn at your own pace</span>
                </div>
                <div className="about-note about-note-bottom"><Groups /><span>Grow together</span></div>
            </div>
        </section>

        <section className="about-purpose">
            <div className="about-section-heading">
                <p className="eyebrow">WHY GARVIT</p>
                <h2>Make room for the <span>“aha” moments.</span></h2>
            </div>
            <p>Every learner starts somewhere different. We bring courses, batches, class resources and practice into one welcoming space, making it easier to keep showing up and see how far you’ve come.</p>
        </section>

        <section className="about-pillars" aria-label="What guides Garvit">
            <article className="about-pillar">
                <span className="about-pillar-icon pillar-lavender"><School /></span>
                <p className="course-number">01 · BUILD A FOUNDATION</p>
                <h3>Clear learning paths</h3>
                <p>Explore courses and batches that help turn a big goal into manageable next steps.</p>
                <Link to="/allcourses">Find a course <ArrowForward /></Link>
            </article>
            <article className="about-pillar">
                <span className="about-pillar-icon pillar-peach"><Groups /></span>
                <p className="course-number">02 · LEARN WITH OTHERS</p>
                <h3>People make progress</h3>
                <p>Join a class, ask questions and share the learning journey with teachers and peers.</p>
                <Link to="/allbatches">Explore batches <ArrowForward /></Link>
            </article>
            <article className="about-pillar">
                <span className="about-pillar-icon pillar-mint"><AutoStories /></span>
                <p className="course-number">03 · KEEP YOUR MOMENTUM</p>
                <h3>Tools for every day</h3>
                <p>Return to study notes and quick practice whenever you need a little extra clarity.</p>
                <Link to="/play-arena">Try the Play Arena <ArrowForward /></Link>
            </article>
        </section>

        <section className="info-cta">
            <div>
                <p className="eyebrow">YOUR NEXT STEP CAN START TODAY</p>
                <h2>Bring your curiosity. We’ll bring the space to grow.</h2>
            </div>
            <Link className="banner-button" to="/register">Get started <ArrowForward /></Link>
        </section>

        <footer className="site-footer">
            <Link className="brand" to="/"><span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span><span>Gar<span className="brand-accent">vit</span></span></Link>
            <p>Small steps. Bright futures.</p>
            <Link to="/contact">Talk with us <ArrowForward /></Link>
        </footer>
    </main>
);

export default About;
