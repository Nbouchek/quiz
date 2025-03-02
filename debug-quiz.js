// Debug script to test quiz API directly
const fetch = require("node-fetch");

// Replace these with actual quiz IDs you want to test
const quizIds = [
  "694f02d2-8109-474c-8dc9-f3507a80abaa", // First quiz ID
  "a7c4e32f-4c8b-43b1-afe6-27b2c6bfc0d8", // Second quiz ID (replace with an actual ID)
];

async function debugQuiz() {
  console.log("=== QUIZ DEBUG TOOL ===");

  for (const quizId of quizIds) {
    console.log(`\n\nTesting quiz ID: ${quizId}`);

    try {
      // Step 1: Get quiz details
      console.log(`\nStep 1: Fetching quiz details for ${quizId}`);
      const quizResponse = await fetch(
        `http://localhost:8082/content/quizzes/${quizId}`
      );

      if (!quizResponse.ok) {
        throw new Error(`Failed to fetch quiz: ${quizResponse.status}`);
      }

      const quizData = await quizResponse.json();
      console.log("Quiz details:", {
        id: quizData.data.id,
        title: quizData.data.title,
        questionCount: quizData.data.questions.length,
      });

      // Step 2: Create an attempt
      console.log(`\nStep 2: Creating attempt for quiz ${quizId}`);
      const attemptResponse = await fetch(
        "http://localhost:8082/study/attempts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: "00000000-0000-0000-0000-000000000001",
            quizId: quizId,
            totalQuestions: quizData.data.questions.length,
          }),
        }
      );

      if (!attemptResponse.ok) {
        throw new Error(`Failed to create attempt: ${attemptResponse.status}`);
      }

      const attemptData = await attemptResponse.json();
      const attemptId = attemptData.data.id;
      console.log("Attempt created:", {
        attemptId,
        quizId: attemptData.data.quizId,
      });

      // Step 3: Get questions for this attempt
      console.log(`\nStep 3: Fetching questions for attempt ${attemptId}`);
      const questionsResponse = await fetch(
        `http://localhost:8082/study/attempts/${attemptId}/questions`
      );

      if (!questionsResponse.ok) {
        throw new Error(
          `Failed to fetch questions: ${questionsResponse.status}`
        );
      }

      const questionsData = await questionsResponse.json();
      console.log("Questions received:", questionsData.data.length);

      // Print the first question as sample
      if (questionsData.data.length > 0) {
        console.log("Sample question:", {
          id: questionsData.data[0].id,
          text: questionsData.data[0].text,
        });
      }
    } catch (error) {
      console.error(`Error testing quiz ${quizId}:`, error);
    }
  }
}

debugQuiz().catch(console.error);
