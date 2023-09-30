import { Modal, VStack } from "@chakra-ui/react";
import axios from "axios";
import { useEffect, useState } from "react";
import { Radio, RadioGroup } from "@chakra-ui/radio";
import { HStack } from "@chakra-ui/layout";
import { useDisclosure } from "@chakra-ui/hooks";
import { Button } from "@chakra-ui/button";
import ErrorDrawer from "../ErrorDrawer";
import { Text } from "@chakra-ui/react";
import { Box } from "@chakra-ui/layout";
import { Flex } from "@chakra-ui/layout";
import { Spacer } from "@chakra-ui/layout";
import { useNavigate } from "react-router-dom";

const PreSurvey = ({ UTORid, isNewUser, setIsNewUser }) => {
  const [questions, setQuestions] = useState([{}]); // [ {question: "", options: []}, ... ]
  const [currQuestion, setCurrQuestion] = useState(0);
  const [surveyID, setSurveyID] = useState("");
  const [studentResponse, setStudentResponse] = useState([]);
  const {
    isOpen: isErrOpen,
    onOpen: onErrOpen,
    onClose: onErrClose,
  } = useDisclosure();
  const [error, setError] = useState();
  const navigate = useNavigate();

  const fetchPreSurvey = () => {
    axios
      .get(
        process.env.REACT_APP_API_URL +
          "/survey/details?survey_id=d18676a6-4419-4ae6-beda-97bc26377942"
      )
      .then((res) => {
        console.log(res.data);
        setQuestions(res.data.questions);
        setSurveyID(res.data.survey_id);
      })
      .catch((err) => {
        setError(err);
        onErrOpen();
      });
  };

  const checkValidResponse = () => {
    for (let i = 0; i < questions.length; i++) {
      if (
        (studentResponse[questions[i].question_type] === "OPEN_ENDED" ||
          studentResponse[questions[i].question_type] === "MULTIPLE_CHOICE") &&
        studentResponse[questions[i].answer] <= 0
      ) {
        return false;
      }
    }
    return true;
  };

  const submitResponse = () => {
    let allResponses = [];
    for (var response in studentResponse) {
      let data = {
        utorid: UTORid,
        question_type: questions[response - 1].question_type,
        question_id: questions[response - 1].question_id,
        survey_type: "Pre",
        survey_id: surveyID,
        answer: studentResponse[response],
      };
      allResponses.push(data);
    }

    if (checkValidResponse() === false) {
      setError("Please answer all questions!");
      onErrOpen();
    } else {
      axios
        .post(
          process.env.REACT_APP_API_URL + "/survey/questions/answer",
          allResponses
        )
        .then((res) => {
          console.log(res.data);
          setIsNewUser(false);
          // navigate("/home");
        })
        .catch((err) => {
          setError(err);
          onErrOpen();
        });
    }
  };
  useEffect(() => {
    fetchPreSurvey();
  }, []);

  if (!isNewUser) {
    return <div></div>;
  }

  return (
    <div>
      <Box ml={"12vw"} mr={"12vw"} mt={10}>
        <Box
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px red solid",
          }}
        >
          <Text
            as="h1"
            style={{ fontFamily: "Poppins", fontWeight: 500, fontSize: "28px" }}
          >
            Pre-Survey
          </Text>
        </Box>
        <VStack
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px red solid",
            minHeight: "80vh",
          }}
        >
          {/* {questions.map((question, question_idx) => (
            <VStack>
              <div
                style={{
                  fontSize: "14px",
                }}
              >
                {question_idx + 1 + "."} {question.question}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  margin: "30px 0px",
                }}
              >
                <div className="scale-question">
                  <RadioGroup
                    onChange={(value) => {
                      setStudentResponse({
                        ...studentResponse,
                        [question_idx + 1]: value,
                      });
                      console.log(studentResponse);
                    }}
                    value={parseInt(studentResponse[question_idx + 1])}
                    display="grid"
                    gridGap={4}
                  >
                    <HStack direction="row" spacing={20}>
                      {question.answers &&
                        question.answers.map((answer, answer_idx) => {
                          return (
                            <div key={answer_idx} className="answer-option">
                              <label>
                                <div className="answer-pretext">
                                  {answer.value}
                                </div>
                                <Radio value={answer.value} />
                                <div className="answer-posttext">
                                  {answer.text}
                                </div>
                              </label>
                            </div>
                          );
                        })}
                    </HStack>
                  </RadioGroup>
                </div>
              </div>
            </VStack>
          ))} */}
          <div
            style={{
              fontSize: "14px",
              height: "15vh",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {questions[currQuestion].question}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              border: "1px blue solid",
              width: "100%",
              minHeight: "65vh",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Question Type: MULTIPLE CHOICE  */}
            {questions[currQuestion] &&
              questions[currQuestion].question_type == "MULTIPLE_CHOICE" && (
                <div>
                  <RadioGroup display="grid" gridGap={4}>
                    {questions[currQuestion].answers.map(
                      (answer, answer_idx) => {
                        return (
                          <Button
                            style={{
                              fontWeight: "normal",
                            }}
                            className={
                              studentResponse[currQuestion + 1] !== answer.value
                                ? "hidden-border"
                                : "selected-border"
                            }
                            onClick={(e) => {
                              setStudentResponse({
                                ...studentResponse,
                                [currQuestion + 1]: answer.value,
                              });
                              console.log(studentResponse);
                            }}
                          >
                            <Text>{answer.text}</Text>
                          </Button>
                        );
                      }
                    )}
                  </RadioGroup>
                </div>
              )}

            {/* Question Type: SCALE */}
            {questions[currQuestion] &&
              questions[currQuestion].question_type == "SCALE" && (
                <RadioGroup display="grid" gridGap={4}>
                  <HStack
                    spacing={12}
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      width: "100%",
                      justifyContent: "center",
                      alignItems: "center",
                    }}
                  >
                    {questions[currQuestion].answers.map(
                      (answer, answer_idx) => {
                        return (
                          <div
                            style={{
                              border: "1px red solid",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                marginLeft: "-30px",
                                marginTop: "-50px",
                                fontSize: "14px",
                                width: "100px",
                                minHeight: "50px",
                                border: "1px red solid",
                                textAlign: "center",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                              }}
                            >
                              {answer.text}
                            </span>
                            <Button
                              style={{
                                fontWeight: "normal",
                              }}
                              className={
                                studentResponse[currQuestion + 1] !==
                                answer.value
                                  ? "hidden-border"
                                  : "selected-border"
                              }
                              onClick={(e) => {
                                setStudentResponse({
                                  ...studentResponse,
                                  [currQuestion + 1]: answer.value,
                                });
                                console.log(studentResponse);
                              }}
                            >
                              <Text>{answer.value}</Text>
                            </Button>
                          </div>
                        );
                      }
                    )}
                  </HStack>
                </RadioGroup>
              )}

            {/* <div className="scale-question">
              <RadioGroup
                onChange={(value) => {
                  setStudentResponse({
                    ...studentResponse,
                    [currQuestion + 1]: value,
                  });
                  console.log(studentResponse);
                }}
                value={parseInt(studentResponse[currQuestion + 1])}
                display="grid"
                gridGap={4}
              >
                <HStack direction="row" spacing={20}>
                  {questions[currQuestion].answers &&
                    questions[currQuestion].answers.map(
                      (answer, answer_idx) => {
                        return (
                          <div key={answer_idx} className="answer-option">
                            <label>
                              <div className="answer-pretext">
                                {answer.value}
                              </div>
                              <Radio value={answer.value} />
                              <div className="answer-posttext">
                                {answer.text}
                              </div>
                            </label>
                          </div>
                        );
                      }
                    )}
                </HStack>
              </RadioGroup>
            </div> */}
          </div>
        </VStack>

        {/* Survey actions */}
        <Box>
          {currQuestion != questions.length - 1 ? (
            <Flex>
              {currQuestion != 0 && (
                <Button
                  onClick={() => {
                    setCurrQuestion(currQuestion - 1);
                  }}
                >
                  Previous
                </Button>
              )}
              <Spacer />
              <Button
                disabled={!studentResponse[currQuestion + 1]}
                onClick={() => {
                  setCurrQuestion(currQuestion + 1);
                }}
              >
                Next
              </Button>
            </Flex>
          ) : (
            <Flex>
              <Button
                onClick={() => {
                  setCurrQuestion(currQuestion - 1);
                }}
              >
                Back
              </Button>
              <Spacer />
              <Button
                disabled={!studentResponse[currQuestion + 1]}
                onClick={() => {
                  submitResponse();
                }}
              >
                Done
              </Button>
            </Flex>
          )}
        </Box>
      </Box>
      <ErrorDrawer isOpen={isErrOpen} onClose={onErrClose} error={error} />
    </div>
  );
};

export default PreSurvey;
