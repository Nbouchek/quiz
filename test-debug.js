import fetch from "node-fetch";

async function testVerificationFix() {
  console.log("Starting test for answer verification fix...");
  // Define API base URLs
  const API_BASE_URL = "http://localhost:8082"; // API Gateway
  const CONTENT_API_URL = `${API_BASE_URL}/content/quizzes`;
  const STUDY_API_URL = `${API_BASE_URL}/study/quiz-attempts`;
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000001"; // Default test user

  try {
    // 1. Get a specific quiz with questions
    const quizId = "32532d2f-cb59-42a2-92b8-6ad360c76d72"; // Quiz with questions
    console.log(`Using quiz with ID: ${quizId}`);

    // 2. Start a quiz attempt
    console.log("Starting a quiz attempt...");
    const startAttemptResponse = await fetch(STUDY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quizId: quizId,
        userId: TEST_USER_ID,
        totalQuestions: 3, // This quiz has 3 questions
      }),
    });

    if (!startAttemptResponse.ok) {
      throw new Error(
        `Failed to start quiz attempt: ${startAttemptResponse.status}`
      );
    }

    const attemptResult = await startAttemptResponse.json();
    console.log("Attempt response:", JSON.stringify(attemptResult, null, 2));

    const attempt = attemptResult.data || attemptResult;
    console.log(`Quiz attempt started with ID: ${attempt.id}`);

    // 3. Get questions for the attempt
    console.log("Fetching questions for the attempt...");
    const questionsResponse = await fetch(
      `${STUDY_API_URL}/${attempt.id}/questions`
    );

    if (!questionsResponse.ok) {
      throw new Error(`Failed to fetch questions: ${questionsResponse.status}`);
    }

    const questionsResult = await questionsResponse.json();
    console.log(
      "Questions response:",
      JSON.stringify(questionsResult, null, 2)
    );

    // Check the structure of the response
    console.log("Questions response type:", typeof questionsResult);
    if (typeof questionsResult === "object") {
      console.log("Questions response keys:", Object.keys(questionsResult));
      if (questionsResult.data) {
        console.log("Questions data type:", typeof questionsResult.data);
        console.log(
          "Is questions data an array?",
          Array.isArray(questionsResult.data)
        );
      }
    }

    const questions = questionsResult.data || questionsResult;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      throw new Error("No questions available for this quiz.");
    }

    console.log(`Retrieved ${questions.length} question(s) for the quiz`);

    // 4. Submit answers for all questions
    console.log("Submitting answers...");
    for (const question of questions) {
      console.log(`Question: ${question.text}`);
      console.log(`Correct answer: ${question.correctAnswer}`);

      // Submit the correct answer
      const submitResponse = await fetch(
        `${STUDY_API_URL}/${attempt.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questionId: question.id,
            answer: question.correctAnswer,
          }),
        }
      );

      if (!submitResponse.ok) {
        throw new Error(`Failed to submit answer: ${submitResponse.status}`);
      }

      const submitResult = await submitResponse.json();
      console.log(`Answer submitted: ${JSON.stringify(submitResult)}`);
    }

    // 5. Complete the attempt
    console.log("Completing the quiz attempt...");
    const completeResponse = await fetch(
      `${STUDY_API_URL}/${attempt.id}/complete`,
      {
        method: "POST",
      }
    );

    if (!completeResponse.ok) {
      throw new Error(
        `Failed to complete quiz attempt: ${completeResponse.status}`
      );
    }

    const completeResult = await completeResponse.json();
    console.log("Complete response:", JSON.stringify(completeResult, null, 2));

    const completedAttempt = completeResult.data || completeResult;
    console.log(
      `Quiz attempt completed with score: ${completedAttempt.score}%`
    );

    // Verify the score
    const expectedScore = 100.0; // All answers are correct
    console.log(`Expected score: ${expectedScore}%`);
    console.log(
      `Server verification ${
        completedAttempt.score === expectedScore ? "WORKING" : "NOT working"
      } correctly`
    );
  } catch (error) {
    console.error("Error during test:", error);
  }
}

testVerificationFix();
