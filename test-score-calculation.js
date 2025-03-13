import fetch from "node-fetch";

async function testScoreCalculation() {
  const API_BASE_URL = "http://localhost:8082";
  const STUDY_API_URL = `${API_BASE_URL}/study/attempts`;
  const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";
  const TEST_QUIZ_ID = "f0592395-0987-4046-b2fb-a65e70d02c95"; // Using previously created test quiz

  console.log("=== TESTING QUIZ SCORE CALCULATION ===");

  // 1. Start a quiz attempt
  console.log("Starting quiz attempt...");
  const startRes = await fetch(STUDY_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: TEST_USER_ID,
      quizId: TEST_QUIZ_ID,
      totalQuestions: 3,
    }),
  });

  const attempt = await startRes.json();
  const attemptId = attempt.data.id;
  console.log(`Created attempt ${attemptId}`);

  // 2. Get questions
  console.log("Fetching questions...");
  const qRes = await fetch(`${STUDY_API_URL}/${attemptId}/questions`);
  const questions = await qRes.json();
  console.log(`Got ${questions.data.length} questions`);

  // 3. Submit answers - deliberately get 2 correct and 1 wrong
  console.log("Submitting answers (2 correct, 1 wrong)...");

  // First answer - correct
  const q1 = questions.data[0];
  await fetch(`${STUDY_API_URL}/${attemptId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId: q1.id,
      answer: q1.correctAnswer,
      isCorrect: true,
    }),
  });
  console.log("Answer 1: Correct");

  // Second answer - correct
  const q2 = questions.data[1];
  await fetch(`${STUDY_API_URL}/${attemptId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId: q2.id,
      answer: q2.correctAnswer,
      isCorrect: true,
    }),
  });
  console.log("Answer 2: Correct");

  // Third answer - wrong (using a different option)
  const q3 = questions.data[2];
  const wrongAnswer = q3.options.find((o) => o !== q3.correctAnswer);
  await fetch(`${STUDY_API_URL}/${attemptId}/answers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      questionId: q3.id,
      answer: wrongAnswer,
      isCorrect: false, // Explicitly mark as incorrect
    }),
  });
  console.log("Answer 3: Wrong");

  // 4. Complete the attempt
  console.log("Completing attempt...");
  const completeRes = await fetch(`${STUDY_API_URL}/${attemptId}/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const result = await completeRes.json();

  // 5. Check the score
  console.log("\nRESULTS:");
  console.log(`Attempt ID: ${result.data.id}`);
  console.log(`Status: ${result.data.status}`);
  console.log(`Score: ${result.data.score}%`);
  console.log(`Expected score for 2/3 correct: 66.67%`);
  console.log(
    `Score calculation correct: ${
      Math.abs(result.data.score - 66.67) < 0.1 ? "YES" : "NO"
    }`
  );
}

testScoreCalculation().catch((err) => console.error("Error:", err));
