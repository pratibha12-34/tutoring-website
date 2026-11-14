import {useState, useEffect} from 'react';
import { Link } from 'react-router-dom';
const Student_Enroll = () => {
    const [c_form, setC_form] = useState({
        name:'',
        course:'',
        language:''
        
    });

    


    return (
        <div>
            <form>
                <label>Username
                    <input type="text" id="name" name="coursename" placeholder=" enter your name" value={c_form.name} onChange={(e) => setC_form({...c_form, name: e.target.value})}/>
                </label>
                <label>Course
                    <input type="text" id="course" placeholder="enter your course" value={c_form.course} onChange={(e) => setC_form({...c_form, course: e.target.value})}/>
                </label>
                <label>language
                    <input type="text" id="language" value={c_form.language} onChange={(e) => setC_form({...c_form, language: e.target.value})} />

                </label>
                
                <Link to="/student"><button type="submit">Enroll</button></Link>
            </form>
        </div>
    )
}


const Teacher_addform = () =>{
    const [t_form, setT_form] = useState({
        name:'',
        course:'',
        language:''
        
    });

    return(
        <>
            <div>
                <form>
                    <label>Teacher Name
                        <input type="text" id="name" placeholder=" enter your name" value={t_form.name} onChange={(e) => setT_form({...t_form, name: e.target.value})}/>
                    </label>
                    <label>Subject Name
                        <input type="text" id="course" placeholder="enter your course" value={t_form.course} onChange={(e) => setT_form({...t_form, course: e.target.value})}/>
                    </label>
                    <label>Language
                        <input type="text" id="language" value={t_form.language} onChange={(e) => setT_form({...t_form, language: e.target_value})} />

                    </label>
                    
                    <Link to="/teacher"><button>Add</button></Link>
                </form>
            </div>
        </>
    )
}

const Teacher_editform = () => {
    return (
        <div>
            <h2>Edit Teacher Information</h2>
            <form>
                <label>Teacher Name
                    <input type="text" id="name" placeholder=" enter your name" />
                </label>
                <label>Subject Name
                    <input type="text" id="course" placeholder="enter your course" />
                </label>
                <label>Language
                    <input type="text" id="language" />
                </label>
                <button>Update</button>
            </form>
        </div>
    )
}

const Teacher_deleteform = () => {
    return (
        <div>
            <h2>Delete Teacher Information</h2>
            <form>
                <label>Teacher Name
                    <input type="text" id="name" placeholder=" enter your name" />
                </label>
                <button>Delete</button>
            </form>
        </div>
    )
}





export default Student_Enroll 
export { Teacher_addform, Teacher_editform, Teacher_deleteform }