import {Box} from "@chakra-ui/react";
import TopNav from "../Components/TopNav";
import Chat from "../Components/Chat/Chat";
import {useState, useEffect} from "react";
import axios from 'axios';
import CustomSpinner from '../Components/CustomSpinner';
import dataToCourseParser from "../ults/dateToCourseParser";

const StudentPage = ({UTORid, courseCode}) => {
  const [courses, setCourses] = useState([]);
  const [currCourse, setCurrCourse] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const getUserId = async () => {
    return await axios.post(process.env.REACT_APP_API_URL + "", {utorid: ""})
    .then((res) => {
      return res._
    })
    .catch((e) => {console.log(e)})
  }

  const getAllCourses = async () => {
    // Gets all the courses a student is enrolled in
    // Pass getUserId return
    return axios.post(process.env.REACT_APP_API_URL + "/user/courses", {user_id: "76d1c94d-48c2-4b7a-9ec9-1390732d84a0"})
      .then((res) => {
        setCourses(res.data.courses);
        if(res.data.courses) setCurrCourse(res.data.courses[0]);
      })
      .catch((err) => console.log(err))
  }

  useEffect(() => {
    getAllCourses();
    setIsLoading(false);
  }, [UTORid])

    return isLoading ? <CustomSpinner /> : (
    <div style={{
        backgroundColor: "#F1F1F1",
        width: "100vw",
        height: '110vh'
      }}>
        <TopNav UTORid={"UTORid"}/>
        {
          currCourse ? <Chat courseCode={currCourse} setCurrCourse={setCurrCourse} semester={dataToCourseParser()} courses={courses} style={{position: 'relative'}}/>
          : <Box ml={'12vw'} mr={'12vw'}>Sorry, you are not enrolled in any courses! : </Box>
        }
        
    </div>
    );
};


export default StudentPage;