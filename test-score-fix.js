import fetch from "node-fetch";

async function testScoreFix() {
  const API_BASE_URL = "http://localhost:8082";
  const CONTENT_API_URL = `${API_BASE_URL}/content/quizzes`;
  const STUDY_API_URL = `${API_BASE_URL}/study/attempts`;
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

  console.log("=== TESTING QUIZ SCORE CALCULATION AFTER FIX ===");

  // 1. Create a new quiz
  console.log("\n1. Creating a new quiz...");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const quizData = {
    title: `Score Fix Test Quiz ${timestamp}`,
    description: "Quiz to test score calculation fix",
    topicId: null,
    creatorId: TEST_USER_ID,
    questions: [
      {
        text: "What is the capital of France?",
        type: "multiple_choice",
        options: ["Berlin", "Paris", "London", "Madrid"],
        correctAnswer: "Paris",
        explanation: "Paris is the capital of France",
      },
      {
        text: "Which planet is closest to the sun?",
        type: "multiple_choice",
        options: ["Venus", "Earth", "Mercury", "Mars"],
        correctAnswer: "Mercury",
        explanation: "Mercury is the closest planet to the sun",
      },
      {
        text: "What is 2 + 2?",
        type: "multiple_choice",
        options: ["3", "4", "5", "22"],
        correctAnswer: "4",
        explanation: "Basic arithmetic: 2 + 2 = 4",
      },
    ],
  };

  const quizResponse = await fetch(CONTENT_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(quizData),
  });

  if (!quizResponse.ok) {
    throw new Error(`Failed to create quiz: ${quizResponse.status}`);
  }

  const quiz = await quizResponse.json();
  console.log(`Quiz created with ID: ${quiz.data.id}`);

  // 2. Start an attempt
  console.log("\n2. Starting a quiz attempt...");
  const startResponse = await fetch(STUDY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: TEST_USER_ID,
      quizId: quiz.data.id,
      totalQuestions: 3,
    }),
  });

  if (!startResponse.ok) {
    throw new Error(`Failed to start attempt: ${startResponse.status}`);
  }

  const attempt = await startResponse.json();
  console.log(`Attempt created with ID: ${attempt.data.id}`);

  // 3. Get questions
  console.log("\n3. Getting questions...");
  const questionsResponse = await fetch(
    `${STUDY_API_URL}/${attempt.data.id}/questions`
  );
  if (!questionsResponse.ok) {
    throw new Error(`Failed to get questions: ${questionsResponse.status}`);
  }

  const questions = await questionsResponse.json();
  console.log(`Retrieved ${questions.data.length} questions`);

  // 4. Submit answers - some correct, some incorrect
  console.log("\n4. Submitting mixed answers (2 correct, 1 incorrect)...");

  // First answer - correct
  console.log("Submitting first answer (CORRECT)...");
  const q1 = questions.data[0];
  const answer1Response = await fetch(
    `${STUDY_API_URL}/${attempt.data.id}/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q1.id,
        answer: q1.correctAnswer, // Correct answer
      }),
    }
  );

  if (!answer1Response.ok) {
    throw new Error(`Failed to submit answer 1: ${answer1Response.status}`);
  }
  const answer1 = await answer1Response.json();
  console.log(`Answer 1 submitted - isCorrect: ${answer1.data.isCorrect}`);

  // Second answer - correct
  console.log("Submitting second answer (CORRECT)...");
  const q2 = questions.data[1];
  const answer2Response = await fetch(
    `${STUDY_API_URL}/${attempt.data.id}/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q2.id,
        answer: q2.correctAnswer, // Correct answer
      }),
    }
  );

  if (!answer2Response.ok) {
    throw new Error(`Failed to submit answer 2: ${answer2Response.status}`);
  }
  const answer2 = await answer2Response.json();
  console.log(`Answer 2 submitted - isCorrect: ${answer2.data.isCorrect}`);

  // Third answer - incorrect
  console.log("Submitting third answer (INCORRECT)...");
  const q3 = questions.data[2];
  const wrongAnswer = q3.options.find((o) => o !== q3.correctAnswer);
  const answer3Response = await fetch(
    `${STUDY_API_URL}/${attempt.data.id}/answers`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: q3.id,
        answer: wrongAnswer, // Incorrect answer
      }),
    }
  );

  if (!answer3Response.ok) {
    throw new Error(`Failed to submit answer 3: ${answer3Response.status}`);
  }
  const answer3 = await answer3Response.json();
  console.log(`Answer 3 submitted - isCorrect: ${answer3.data.isCorrect}`);

  // 5. Complete the attempt
  console.log("\n5. Completing the attempt...");
  const completeResponse = await fetch(
    `${STUDY_API_URL}/${attempt.data.id}/complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }
  );

  if (!completeResponse.ok) {
    throw new Error(`Failed to complete attempt: ${completeResponse.status}`);
  }

  const completedAttempt = await completeResponse.json();

  // 6. Verify the score
  console.log("\n6. RESULTS:");
  console.log(`Final Score: ${completedAttempt.data.score.toFixed(2)}%`);
  console.log(`Expected Score: 66.67% (2/3 correct answers)`);

  const expectedScore = 66.67;
  const isCorrect = Math.abs(completedAttempt.data.score - expectedScore) < 0.1;

  console.log(
    `Score calculation is ${isCorrect ? "CORRECT ✅" : "INCORRECT ❌"}`
  );

  if (isCorrect) {
    console.log(
      "\n✅ SUCCESS: The score calculation fix is working correctly!"
    );
  } else {
    console.log(
      "\n❌ ERROR: The score calculation fix is not working correctly."
    );
  }
}

testScoreFix().catch((error) => console.error("Error:", error));
