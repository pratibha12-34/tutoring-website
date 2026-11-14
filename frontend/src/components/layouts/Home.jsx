import { Link } from 'react-router-dom';

import {
    ArrowForward,
    AutoStories,
    CheckCircle,
    Groups,
    MenuBook,
    School,
    SportsEsports,
    Videocam,
} from '@mui/icons-material';
import Navbar from './Navbar.jsx';
import Seo from '../Seo.jsx';

const Home = () => {
    return(
        <main className="home-page">
            <Seo
                title="Garvit | Online Tutoring, Live Classes & Study Resources"
                description="Explore tutoring courses, live classes and study resources with Garvit. Learn with teachers and study at your own pace."
                canonicalPath="/"
                structuredData={{
                    '@context': 'https://schema.org',
                    '@type': 'EducationalOrganization',
                    name: 'Garvit',
                    description: 'Tutoring courses, live classes and study resources for learners.'
                }}
            />
            <nav className="site-nav" aria-label="Main navigation">
                <span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span>            
                
               
                <div className="site-nav-links">
                   <Navbar/>
                </div>
            </nav>

            <section className="hero">
                <div className="hero-copy">
                    <p className="eyebrow"><span className="eyebrow-dot" /> YOUR NEXT CHAPTER STARTS HERE</p>
                    <h1>Big goals begin with <span>one bright idea.</span></h1>
                    <p className="hero-description">Learn at your pace with expert teachers, live classes and a community that helps you go further.</p>
                    <div className="hero-actions">
                        <Link className="primary-button" to="/register">Start learning <ArrowForward /></Link>
                        <Link className="text-button" to="/login">I already have an account</Link>
                    </div>
                    <div className="learner-count">
                        <div className="avatar-stack" aria-hidden="true"><span>R</span><span>A</span><span>M</span><span>+</span></div>
                        <p><b>12,000+ learners</b><br />are growing with Garvit</p>
                    </div>
                </div>
                <div className="hero-art" aria-label="Learning illustration">
                    <div className="art-orbit orbit-one" />
                    <div className="art-orbit orbit-two" />
                    <div className="art-main-card">
                        <div className="art-card-top"><span className="art-icon"><AutoStories /></span><span className="live-tag"><i /> LIVE CLASS</span></div>
                        <p className="art-label">TODAY'S FOCUS</p>
                        <h2>Make progress<br />feel possible.</h2>
                        <div className="progress-caption"><span>Your weekly goal</span><b>4 / 5 days</b></div>
                        <div className="progress-track"><span /></div>
                        <div className="art-teacher"><span className="teacher-avatar">AK</span><span><b>You're doing great!</b><small>Keep your momentum going</small></span><CheckCircle className="teacher-check" /></div>
                    </div>
                    <div className="float-note"><span className="float-note-icon"><Groups /></span><span><b>Learn together</b><small>Better, side by side</small></span></div>
                    <div className="sparkle sparkle-one">✦</div><div className="sparkle sparkle-two">✦</div>
                </div>
            </section>

            <section className="intro" id="learning">
                <p className="eyebrow">A LITTLE MORE YOU, A LOT MORE LEARNING</p>
                <h2>Curiosity looks good on you.</h2>
                <p>Everything you need to turn “I wonder” into “I can”.</p>
            </section>
        
            <section className="courses" aria-label="Learning features">
                <article className="course-card">
                    <div className="course-card-icon icon-coral" aria-hidden="true"><MenuBook /></div>
                    <p className="course-number">LEARN YOUR WAY</p>
                    <h3>Courses that click</h3>
                    <p>Clear lessons and thoughtful notes, made to fit your goals.</p>
                    <Link to="/student">Explore <ArrowForward /></Link>
                </article>
                <article className="course-card">
                    <div className="course-card-icon icon-blue" aria-hidden="true"><Videocam /></div>
                    <p className="course-number">SHOW UP & SHINE</p>
                    <h3>Live, lively classes</h3>
                    <p>Ask questions, share ideas and learn alongside your batch.</p>
                    <Link to="/student">Explore <ArrowForward /></Link>
                </article>
                <article className="course-card">
                    <div className="course-card-icon icon-yellow" aria-hidden="true"><AutoStories /></div>
                    <p className="course-number">EVERY STEP COUNTS</p>
                    <h3>Progress you can feel</h3>
                    <p>Celebrate small milestones on the way to big things.</p>
                    <Link to="/teacher">Meet your teachers <ArrowForward /></Link>
                </article>
            </section>

            <section className="journey-banner study-tools-banner" aria-label="Study tools">
                <div className="journey-icon"><SportsEsports /></div>
                <div>
                    <p className="eyebrow">A STUDY BREAK THAT BUILDS YOUR SKILLS</p>
                    <h2>Ready to put your knowledge to play?</h2>
                    <p>Try a quick quiz in the Play Arena, then review key ideas in your study notes.</p>
                </div>
                <div className="study-tools-actions">
                    <Link className="banner-button" to="/play-arena">Play Arena <ArrowForward /></Link>
                    <Link className="study-notes-button" to="/notes">Explore notes</Link>
                </div>
            </section>

            <section className="journey-banner" id="about">
                <div className="journey-icon"><School /></div>
                <div>
                    <p className="eyebrow">YOUR JOURNEY, YOUR SPACE</p>
                    <h2>Learning should open doors.</h2>
                    <p>Find your rhythm with teachers who care and a community that celebrates every step forward.</p>
                </div>
                <Link className="banner-button" to="/register">Find your start <ArrowForward /></Link>
            </section>
            <footer className="site-footer"><Link className="brand" to="/"><span className="brand-mark"><img src="/assests/logo1.jpeg" alt="" /></span><span>Gar<span className="brand-accent">vit</span></span></Link><p>Small steps. Bright futures.</p><Link to="/login">Your learning space <ArrowForward /></Link></footer>
        </main>
    )
}

export default Home