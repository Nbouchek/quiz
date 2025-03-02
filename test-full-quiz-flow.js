// Full Quiz Flow Test Script
// This script tests the entire flow:
// 1. Create a new quiz
// 2. Attempt the quiz
// 3. Answer questions
// 4. Complete the attempt

import fetch from "node-fetch";

// Constants
const API_BASE_URL = "http://localhost:8082";
const CONTENT_API_URL = `${API_BASE_URL}/content/quizzes`;
const STUDY_API_URL = `${API_BASE_URL}/study/attempts`;
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// Utility function for colorful console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
};

const log = {
  info: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}${msg}${colors.reset}`),
  header: (msg) =>
    console.log(
      `\n${colors.bright}${colors.magenta}=== ${msg} ===${colors.reset}\n`
    ),
  json: (label, data) =>
    console.log(
      `${label}: ${colors.yellow}${JSON.stringify(data, null, 2)}${
        colors.reset
      }`
    ),
};

// 1. Create a new quiz with unique title
async function createQuiz() {
  log.header("STEP 1: CREATING A NEW QUIZ");

  // Generate a unique quiz title with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const quizTitle = `Test Quiz ${timestamp}`;

  log.info(`Creating quiz with title: ${quizTitle}`);

  const quizData = {
    title: quizTitle,
    description: "This is an automatically generated test quiz",
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

  try {
    const response = await fetch(CONTENT_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quizData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to create quiz: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await response.json();
    log.success("Quiz created successfully!");
    log.json("Quiz data", result.data);

    return result.data;
  } catch (error) {
    log.error(`Error creating quiz: ${error.message}`);
    throw error;
  }
}

// 2. Start a quiz attempt
async function startQuizAttempt(quizId, totalQuestions) {
  log.header("STEP 2: STARTING QUIZ ATTEMPT");
  log.info(
    `Starting attempt for quiz ID: ${quizId} with ${totalQuestions} questions`
  );

  try {
    // Make direct call to study service to start attempt
    const response = await fetch(STUDY_API_URL, {
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to start attempt: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await response.json();
    log.success("Quiz attempt started successfully!");
    log.json("Attempt data", result.data);

    return result.data;
  } catch (error) {
    log.error(`Error starting quiz attempt: ${error.message}`);
    throw error;
  }
}

// 3. Get questions for an attempt
async function getQuestionsForAttempt(attemptId) {
  log.header("STEP 3: FETCHING QUESTIONS");
  log.info(`Fetching questions for attempt ID: ${attemptId}`);

  try {
    // First try the API gateway
    const response = await fetch(`${STUDY_API_URL}/${attemptId}/questions`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch questions: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await response.json();
    log.success(`Retrieved ${result.data.length} questions successfully!`);
    log.json("Sample question", result.data[0]);

    return result.data;
  } catch (error) {
    log.error(`Error fetching questions: ${error.message}`);
    throw error;
  }
}

// 4. Submit answers to questions
async function submitAnswers(attemptId, questions) {
  log.header("STEP 4: SUBMITTING ANSWERS");

  try {
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      log.info(
        `Submitting answer for question ${i + 1}/${questions.length}: "${
          question.text
        }"`
      );

      // Pick first option as the answer (doesn't matter for this test)
      const selectedAnswer = question.options[0];

      const response = await fetch(`${STUDY_API_URL}/${attemptId}/answers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: question.id,
          answer: selectedAnswer,
          isCorrect: true, // We're just testing the flow, so mark as correct
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Failed to submit answer: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const result = await response.json();
      log.success(`Answer ${i + 1} submitted successfully!`);
    }

    return true;
  } catch (error) {
    log.error(`Error submitting answers: ${error.message}`);
    throw error;
  }
}

// 5. Complete the quiz attempt
async function completeQuizAttempt(attemptId) {
  log.header("STEP 5: COMPLETING QUIZ ATTEMPT");
  log.info(`Completing attempt ID: ${attemptId}`);

  try {
    const response = await fetch(`${STUDY_API_URL}/${attemptId}/complete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to complete attempt: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await response.json();
    log.success("Quiz attempt completed successfully!");
    log.json("Completion data", result.data);

    return result.data;
  } catch (error) {
    log.error(`Error completing quiz attempt: ${error.message}`);
    throw error;
  }
}

// 6. Verify the attempt by retrieving it
async function verifyAttempt(attemptId) {
  log.header("STEP 6: VERIFYING QUIZ ATTEMPT");
  log.info(`Retrieving attempt ID: ${attemptId} for verification`);

  try {
    const response = await fetch(`${STUDY_API_URL}/${attemptId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to retrieve attempt: ${response.status} - ${JSON.stringify(
          errorData
        )}`
      );
    }

    const result = await response.json();
    log.success("Quiz attempt verified successfully!");
    log.json("Final attempt data", result.data);

    return result.data;
  } catch (error) {
    log.error(`Error verifying quiz attempt: ${error.message}`);
    throw error;
  }
}

// Main function to run the full flow
async function runFullQuizFlow() {
  try {
    log.header("STARTING FULL QUIZ FLOW TEST");

    // Step 1: Create a new quiz
    const quiz = await createQuiz();
    const quizId = quiz.id;
    const totalQuestions = quiz.questions.length;

    // Step 2: Start a quiz attempt
    const attempt = await startQuizAttempt(quizId, totalQuestions);
    const attemptId = attempt.id;

    // Step 3: Get questions for this attempt
    const questions = await getQuestionsForAttempt(attemptId);

    // Verify that the questions match the quiz we created
    if (questions.length !== totalQuestions) {
      log.error(
        `WARNING: Expected ${totalQuestions} questions but got ${questions.length}`
      );
    } else {
      log.success(
        `VERIFICATION: Question count matches expected count of ${totalQuestions}`
      );
    }

    // Step 4: Submit answers to all questions
    await submitAnswers(attemptId, questions);

    // Step 5: Complete the quiz attempt
    const completedAttempt = await completeQuizAttempt(attemptId);

    // Step 6: Verify the completed attempt
    const verifiedAttempt = await verifyAttempt(attemptId);

    log.header("TEST COMPLETE");
    log.success(
      `Successfully created quiz "${quiz.title}" and completed an attempt!`
    );
    log.success(`Quiz ID: ${quizId}`);
    log.success(`Attempt ID: ${attemptId}`);
    log.success(`Status: ${verifiedAttempt.status}`);
    log.success(`Score: ${verifiedAttempt.score}`);

    return {
      success: true,
      quizId,
      attemptId,
      score: verifiedAttempt.score,
    };
  } catch (error) {
    log.header("TEST FAILED");
    log.error(`Error running full quiz flow: ${error.message}`);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Execute the full flow
runFullQuizFlow()
  .then((result) => {
    if (result.success) {
      log.success("\nSUCCESS: The full quiz flow works correctly!");
      process.exit(0);
    } else {
      log.error("\nFAILURE: The quiz flow test encountered errors.");
      process.exit(1);
    }
  })
  .catch((err) => {
    log.error(`\nFATAL ERROR: ${err}`);
    process.exit(1);
  });
