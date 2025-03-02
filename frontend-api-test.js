// Frontend API Test for Quiz Attempt Endpoints
// This script tests that the frontend can correctly use the quiz attempt API endpoints
// by simulating the exact API calls made by the frontend components

import fetch from "node-fetch";

// Use the same constants as the frontend (from config/constants.ts)
const API_BASE_URL = "http://localhost:8082";
const STUDY_API_URL = `${API_BASE_URL}/study`;
const CONTENT_API_URL = `${API_BASE_URL}/content`;
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// Utility functions for colored output
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

// 1. Start a quiz attempt - simulating useQuizAttempt.startAttempt
async function startAttempt(quizId, totalQuestions) {
  printHeader(
    "TESTING TakeQuizPage.initializeQuiz() / useQuizAttempt.startAttempt()"
  );
  printInfo(
    `Creating attempt for quiz ID: ${quizId} with ${totalQuestions} questions`
  );

  // Create the request payload as in useQuizAttempt.startAttempt
  const payload = {
    userId: TEST_USER_ID,
    quizId: quizId,
    totalQuestions: totalQuestions,
  };

  printInfo(`Using payload: ${JSON.stringify(payload)}`);

  try {
    // Make the same API call as the frontend's useQuizAttempt.startAttempt
    printInfo(`Sending POST request to: ${STUDY_API_URL}/attempts`);

    const response = await fetch(`${STUDY_API_URL}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      printError(`API error (${response.status}): ${errorText}`);

      // Try alternative endpoint like the frontend does
      printInfo("Trying alternative endpoint (like frontend fallback)");
      const altResponse = await fetch(
        `${STUDY_API_URL}/quiz/${quizId}/attempt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            userId: TEST_USER_ID,
            totalQuestions: totalQuestions,
          }),
        }
      );

      if (!altResponse.ok) {
        throw new Error(
          `Both endpoints failed. Status: ${response.status} / ${altResponse.status}`
        );
      }

      const altData = await altResponse.json();
      printSuccess(
        "Alternative endpoint worked (simulating frontend fallback)"
      );
      printJson("Attempt data", altData.data);

      return altData.data;
    }

    const data = await response.json();
    printSuccess("Quiz attempt started successfully!");
    printJson("Attempt data", data.data);

    return data.data;
  } catch (error) {
    printError(`Error starting quiz attempt: ${error.message}`);
    throw error;
  }
}

// 2. Get questions for attempt - simulating useQuizAttempt.getQuestions
async function getQuestions(attemptId) {
  printHeader(
    "TESTING TakeQuizPage.initializeQuiz() / useQuizAttempt.getQuestions()"
  );
  printInfo(`Fetching questions for attempt ID: ${attemptId}`);

  try {
    // Make the same API call as the frontend's useQuizAttempt.getQuestions
    const questionsUrl = `${STUDY_API_URL}/attempts/${attemptId}/questions`;
    printInfo(`Sending GET request to: ${questionsUrl}`);

    const response = await fetch(questionsUrl, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      printError(`API error (${response.status}): ${errorText}`);
      throw new Error(`Failed to fetch questions: ${response.status}`);
    }

    const data = await response.json();
    printSuccess(`Retrieved ${data.data.length} questions successfully!`);
    printJson("First question", data.data[0]);

    return data.data;
  } catch (error) {
    printError(`Error fetching questions: ${error.message}`);
    throw error;
  }
}

// 3. Submit answer to a question - simulating useQuizAttempt.submitAnswer
async function submitAnswer(attemptId, questionId, answer) {
  printHeader(
    "TESTING TakeQuizPage.handleAnswerSubmit() / useQuizAttempt.submitAnswer()"
  );
  printInfo(`Submitting answer for question ID: ${questionId}`);

  try {
    // Create the payload as in useQuizAttempt.submitAnswer
    // The frontend assumes every answer is correct for testing
    const payload = {
      questionId: questionId,
      answer: answer,
      isCorrect: true, // Frontend sends this as true for testing
    };

    printInfo(`Using payload: ${JSON.stringify(payload)}`);

    // Make the same API call as the frontend's useQuizAttempt.submitAnswer
    const answerUrl = `${STUDY_API_URL}/attempts/${attemptId}/answers`;
    printInfo(`Sending POST request to: ${answerUrl}`);

    const response = await fetch(answerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      printError(`API error (${response.status}): ${errorText}`);
      throw new Error(`Failed to submit answer: ${response.status}`);
    }

    const data = await response.json();
    printSuccess("Answer submitted successfully!");
    printJson("Answer data", data.data);

    return data.data;
  } catch (error) {
    printError(`Error submitting answer: ${error.message}`);
    throw error;
  }
}

// 4. Complete the quiz attempt - simulating useQuizAttempt.completeAttempt
async function completeAttempt(attemptId) {
  printHeader(
    "TESTING TakeQuizPage.handleQuizComplete() / useQuizAttempt.completeAttempt()"
  );
  printInfo(`Completing attempt ID: ${attemptId}`);

  try {
    // Make the same API call as the frontend's useQuizAttempt.completeAttempt
    const completeUrl = `${STUDY_API_URL}/attempts/${attemptId}/complete`;
    printInfo(`Sending POST request to: ${completeUrl}`);

    const response = await fetch(completeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      printError(`API error (${response.status}): ${errorText}`);
      throw new Error(`Failed to complete attempt: ${response.status}`);
    }

    const data = await response.json();
    printSuccess("Quiz attempt completed successfully!");
    printJson("Completion data", data.data);

    return data.data;
  } catch (error) {
    printError(`Error completing quiz attempt: ${error.message}`);
    throw error;
  }
}

// Main test function - simulates the entire frontend flow
async function testFrontendComponents() {
  printHeader("STARTING FRONTEND COMPONENT TEST");

  try {
    // Get a quiz ID to use - same as the frontend would use
    const response = await fetch(`${CONTENT_API_URL}/quizzes`);
    if (!response.ok) {
      throw new Error("Failed to get quizzes");
    }

    const quizzes = await response.json();
    const testQuiz = quizzes.data[0];
    printInfo(
      `Using quiz "${testQuiz.title}" (ID: ${testQuiz.id}) for testing`
    );

    // 1. Create a quiz attempt (TakeQuizPage.initializeQuiz)
    const attempt = await startAttempt(testQuiz.id, 3);

    // 2. Get questions for this attempt (TakeQuizPage.initializeQuiz)
    const questions = await getQuestions(attempt.id);

    // 3. Submit an answer to the first question (TakeQuizPage.handleAnswerSubmit)
    if (questions.length > 0) {
      // Get the correct answer from question
      const correctAnswer =
        questions[0].correctAnswer || questions[0].options[0];
      await submitAnswer(attempt.id, questions[0].id, correctAnswer);
    }

    // 4. Complete the quiz attempt (TakeQuizPage.handleQuizComplete)
    const completedAttempt = await completeAttempt(attempt.id);

    printHeader("FRONTEND COMPONENTS TEST COMPLETE");
    printSuccess("All frontend component API calls work correctly!");
    printInfo(`Quiz: ${testQuiz.title}`);
    printInfo(`Attempt ID: ${attempt.id}`);
    printInfo(`Status: ${completedAttempt.status}`);
    printInfo(`Score: ${completedAttempt.score}`);

    return true;
  } catch (error) {
    printHeader("TEST FAILED");
    printError(`Error testing frontend components: ${error.message}`);
    return false;
  }
}

// Execute the test
testFrontendComponents()
  .then((success) => {
    if (success) {
      printSuccess(
        "\nSUCCESS: Frontend components can correctly use the attempt API endpoints!"
      );
      process.exit(0);
    } else {
      printError("\nFAILURE: Frontend components test encountered errors.");
      process.exit(1);
    }
  })
  .catch((err) => {
    printError(`\nFATAL ERROR: ${err}`);
    process.exit(1);
  });
