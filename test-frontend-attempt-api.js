// Frontend Quiz Attempt API Test
// This script tests if the frontend can correctly use the quiz attempt API endpoints:
// 1. Create an attempt
// 2. Get questions
// 3. Submit answers
// 4. Complete the attempt

import fetch from "node-fetch";

// Constants - same as used in the frontend
const API_BASE_URL = "http://localhost:8082";
const STUDY_API_URL = `${API_BASE_URL}/study`;
const CONTENT_API_URL = `${API_BASE_URL}/content`;
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// Utility functions for output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

function printHeader(text) {
  console.log(
    `\n${colors.bright}${colors.magenta}=== ${text} ===${colors.reset}\n`
  );
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.cyan}ℹ ${text}${colors.reset}`);
}

function printJson(label, data) {
  console.log(
    `${label}:\n${colors.yellow}${JSON.stringify(data, null, 2)}${colors.reset}`
  );
}

// 1. Get available quizzes (simulating frontend behavior)
async function getAvailableQuizzes() {
  printHeader("GETTING AVAILABLE QUIZZES");

  try {
    const response = await fetch(`${CONTENT_API_URL}/quizzes`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch quizzes: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const { data } = await response.json();
    printSuccess(`Found ${data.length} quizzes`);

    // Just return the first quiz for testing
    const testQuiz = data[0];
    printInfo(
      `Using quiz "${testQuiz.title}" (ID: ${testQuiz.id}) for testing`
    );

    return testQuiz;
  } catch (error) {
    printError(`Error fetching quizzes: ${error.message}`);
    throw error;
  }
}

// 2. Start a quiz attempt (using the frontend's exact API call pattern)
async function startQuizAttempt(quizId, totalQuestions) {
  printHeader("STARTING QUIZ ATTEMPT");
  printInfo(`Creating attempt for quiz ID: ${quizId}`);

  try {
    // Use the same endpoint and payload structure as the frontend
    const response = await fetch(`${STUDY_API_URL}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        quizId: quizId,
        totalQuestions: totalQuestions,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      printError(`Raw error response: ${errorText}`);
      throw new Error(`Failed to start attempt: ${response.status}`);
    }

    // First get response as text to inspect it (like frontend does)
    const responseText = await response.text();
    printInfo(`Raw response: ${responseText}`);

    // Then parse as JSON
    const data = JSON.parse(responseText);
    printSuccess("Quiz attempt started successfully!");
    printJson("Attempt data", data.data);

    return data.data;
  } catch (error) {
    printError(`Error starting quiz attempt: ${error.message}`);
    throw error;
  }
}

// 3. Get questions for an attempt (using the frontend's pattern)
async function getQuestionsForAttempt(attemptId) {
  printHeader("FETCHING QUESTIONS");
  printInfo(`Fetching questions for attempt ID: ${attemptId}`);

  try {
    // Use the same pattern as the frontend
    const questionsUrl = `${STUDY_API_URL}/attempts/${attemptId}/questions`;
    printInfo(`Fetching from URL: ${questionsUrl}`);

    const response = await fetch(questionsUrl);

    if (!response.ok) {
      const errorText = await response.text();
      printError(`Raw error response: ${errorText}`);
      throw new Error(`Failed to fetch questions: ${response.status}`);
    }

    const { data } = await response.json();
    printSuccess(`Retrieved ${data.length} questions successfully!`);
    printJson("First question", data[0]);

    return data;
  } catch (error) {
    printError(`Error fetching questions: ${error.message}`);
    throw error;
  }
}

// 4. Submit answer to a question (using the frontend's pattern)
async function submitAnswer(attemptId, question) {
  printHeader("SUBMITTING ANSWER");
  printInfo(`Submitting answer for question: "${question.text}"`);

  try {
    // Get the correct answer for testing
    const correctAnswer = question.correctAnswer;

    // IMPORTANT: The isCorrect field MUST be lowercase in the payload.
    // This is exactly what the frontend does
    const payload = {
      questionId: question.id,
      answer: correctAnswer,
      isCorrect: true, // We know it's correct because we're using the correctAnswer
    };

    printInfo(`Using payload: ${JSON.stringify(payload)}`);

    const response = await fetch(
      `${STUDY_API_URL}/attempts/${attemptId}/answers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      printError(`Raw error response: ${errorText}`);
      throw new Error(`Failed to submit answer: ${response.status}`);
    }

    // First get response as text to inspect it (like frontend does)
    const responseText = await response.text();
    printInfo(`Raw response: ${responseText}`);

    // Then parse as JSON
    const data = JSON.parse(responseText);
    printSuccess("Answer submitted successfully!");
    printJson("Answer data", data.data);

    return data.data;
  } catch (error) {
    printError(`Error submitting answer: ${error.message}`);
    throw error;
  }
}

// 5. Complete the quiz attempt (using the frontend's pattern)
async function completeQuizAttempt(attemptId) {
  printHeader("COMPLETING QUIZ ATTEMPT");
  printInfo(`Completing attempt ID: ${attemptId}`);

  try {
    // Use the same endpoint as the frontend
    const response = await fetch(
      `${STUDY_API_URL}/attempts/${attemptId}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      printError(`Raw error response: ${errorText}`);
      throw new Error(`Failed to complete attempt: ${response.status}`);
    }

    const { data } = await response.json();
    printSuccess("Quiz attempt completed successfully!");
    printJson("Completion data", data);

    return data;
  } catch (error) {
    printError(`Error completing quiz attempt: ${error.message}`);
    throw error;
  }
}

// Main function to run the frontend API test
async function testFrontendApi() {
  try {
    printHeader("STARTING FRONTEND API TEST");

    // Step 1: Get quiz to use
    const quiz = await getAvailableQuizzes();
    const quizId = quiz.id;
    const totalQuestions = quiz.questions ? quiz.questions.length : 3;

    // Step 2: Start a quiz attempt
    const attempt = await startQuizAttempt(quizId, totalQuestions);
    const attemptId = attempt.id;

    // Step 3: Get questions for this attempt
    const questions = await getQuestionsForAttempt(attemptId);

    // Step 4: Submit an answer to the first question
    if (questions.length > 0) {
      await submitAnswer(attemptId, questions[0]);
    }

    // Step 5: Complete the quiz attempt
    const completedAttempt = await completeQuizAttempt(attemptId);

    printHeader("TEST COMPLETE");
    printSuccess("Frontend API test completed successfully!");
    printInfo(`Quiz: ${quiz.title}`);
    printInfo(`Quiz ID: ${quizId}`);
    printInfo(`Attempt ID: ${attemptId}`);
    printInfo(`Status: ${completedAttempt.status}`);
    printInfo(`Score: ${completedAttempt.score}`);

    return true;
  } catch (error) {
    printHeader("TEST FAILED");
    printError(`Error testing frontend API: ${error.message}`);
    return false;
  }
}

// Execute the test
testFrontendApi()
  .then((success) => {
    if (success) {
      printSuccess(
        "\nSUCCESS: The frontend can correctly use the attempt endpoints!"
      );
      process.exit(0);
    } else {
      printError("\nFAILURE: The frontend API test encountered errors.");
      process.exit(1);
    }
  })
  .catch((err) => {
    printError(`\nFATAL ERROR: ${err}`);
    process.exit(1);
  });
