import Subjects from '../layouts/Subjects';
import Attendance from '../layouts/Attendance';
import Teacher_sal from '../layouts/Teacher_salary';
import { AutoStories, School } from '@mui/icons-material';
import ThemeToggle from '../ThemeToggle.jsx';
import './Dashboard.css';
import './Teacher.css';

const Teacher = () => {
    return(
        <main>
             <ThemeToggle />
             <div className="teacher-page">
           
            <header>
                
                <div className="dashboard-welcome">
                    <span className="dashboard-kicker"><School /> TEACHER WORKSPACE</span>
                    <h1>Make today a little brighter.</h1>
                    <p>Your classes, attendance and subjects all in one place.</p>
                </div>
                
                <div className="dashboard-header-icon"><AutoStories /></div>
            </header>
            <main>
                <Attendance/>
                <Subjects/>
                <section className="teacher-salary-panel" aria-label="Teacher salary">
                    <h2>Salary details</h2>
                    <Teacher_sal/>
                </section>
            </main>

        </div>
        </main>
       
    )
}

export default Teacher;