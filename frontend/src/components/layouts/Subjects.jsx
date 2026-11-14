import { Biotech, MenuBook, Science } from '@mui/icons-material';

const Subjects = () =>{
    return(
        <div className="dashboard-card">
            <header>
                <h2><span className="section-icon icon-purple"><MenuBook /></span>Your subjects</h2>
            </header>
            <div>
                <table>
                    <thead>
                        <tr><th scope="col">Subject name</th></tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span className="subject-icon icon-blue"><Science /></span>Physics</td>
                        </tr>
                        <tr>
                            <td><span className="subject-icon icon-green"><Biotech /></span>Chemistry</td>
                        </tr>
                        <tr>
                            <td><span className="subject-icon icon-coral"><Science /></span>Biology</td>
                        </tr>                      
                        
                        
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Subjects