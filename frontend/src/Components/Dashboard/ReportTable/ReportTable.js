import {
    Box, 
    Heading,
    Table,
    Thead,
    Tbody,
    Tfoot,
    Tr,
    Th,
    Td,
    TableCaption,
    TableContainer,
    VStack
} from "@chakra-ui/react";

import axios from "axios";
import {useEffect, useState} from "react";

const ReportTable = ( { course_ID, isWeekly } ) => {

  const cardStyle = {
    backgroundColor: 'white',
    boxShadow: '1px 2px 3px 1px rgba(0,0,0,0.12)',
    borderRadius: '15px',
    padding: '5px 15px 15px 20px',
    maxWidth: 'fit-content',
  };

  const titleStyle = {
    fontSize: "20px",
    lineHeight: '25px'
  };

  const [reportList, changeReportList] = useState([{}]);

    useEffect(() => {
      if (course_ID.length != 0){
        fetchReports();
      }
      console.log("report table", course_ID, isWeekly);
    }, [course_ID, isWeekly]);

    const fetchReports = async () => {
      return await axios.post(process.env.REACT_APP_API_URL + "/researcher/reported-conversations", {course_id: course_ID, filter: (isWeekly === 1 ? "Weekly" : "Monthly")
      , timezone: "America/Toronto"})
        .then((res) => {
          const entries = [];
          for (const obj in Object.keys(res.data.reported_conversations)) {
            entries.push({
              conversation_id: res.data.reported_conversations[obj]["conversation_id"],
              user_id: res.data.reported_conversations[obj]["user_id"], time: res.data.reported_conversations[obj]["time"], msg: res.data.reported_conversations[obj]["msg"]
            });
          }
          changeReportList(entries);
        })
        .catch((err) => console.log(err))
    };


    return (
        
        <Box style={cardStyle} mt={6}>
            <Heading as='h2'><span style={titleStyle}>Reported Conversations (Detailed)</span></Heading>
            <TableContainer>
            <VStack style= {{
                    height: "40vh",
                    overflowY: "scroll",
                    overflowX: "hidden",
                    maxWidth: 'fit-content',
                }}>
            <Table variant='unstyled'>
                <Thead>
                <Tr>
                    <Th>Conversation ID</Th>
                    <Th>User ID</Th>
                    <Th>Report Time</Th>
                    <Th>Report Message</Th>
                </Tr>
                </Thead>
                <Tbody>
                {reportList.map((obj, index) => (
                  // create a new entry in the table by unwrapping the corresponding fields
                  <Tr key={index}>
                    <Td>{obj.conversation_id}</Td>
                    <Td>{obj.user_id}</Td>
                    <Td>{obj.time}</Td>
                    <Td>{obj.msg}</Td>
                  </Tr>
                ))}
                </Tbody>
            </Table>
            </VStack>
            </TableContainer>
        </Box>
    );
}

export default ReportTable;