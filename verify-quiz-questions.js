// Quiz Questions Verification Script
// This script creates a quiz and verifies that the correct questions are returned

const fetch = require("node-fetch");

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

// Debug tools to inspect services directly
const debugServices = {
  // Call the content service directly to get quiz details
  getQuizFromContentService: async (quizId) => {
    log.info(`Direct fetch from content service for quiz ${quizId}`);
    try {
      const response = await fetch(`http://localhost:8081/quizzes/${quizId}`);
      if (!response.ok) {
        throw new Error(`Content service error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      log.error(`Content service error: ${error.message}`);
      return null;
    }
  },

  // Call the study service directly to get questions for an attempt
  getQuestionsFromStudyService: async (attemptId) => {
    log.info(`Direct fetch from study service for attempt ${attemptId}`);
    try {
      const response = await fetch(
        `http://localhost:8084/attempts/${attemptId}/questions`
      );
      if (!response.ok) {
        throw new Error(`Study service error: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      log.error(`Study service error: ${error.message}`);
      return null;
    }
  },
};

// 1. Create a new quiz with unique title and specific questions
async function createQuiz() {
  log.header("STEP 1: CREATING A NEW QUIZ");

  // Generate a unique quiz title with timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const quizTitle = `Verification Quiz ${timestamp}`;

  log.info(`Creating quiz with title: ${quizTitle}`);

  // Create very distinctive questions for easier verification
  const quizData = {
    title: quizTitle,
    description: "This quiz is created to verify question retrieval",
    topicId: null,
    creatorId: TEST_USER_ID,
    questions: [
      {
        text: "VERIFICATION QUESTION 1: What color is the sky?",
        type: "multiple_choice",
        options: ["Green", "Blue", "Purple", "Yellow"],
        correctAnswer: "Blue",
        explanation: "The sky appears blue due to Rayleigh scattering",
      },
      {
        text: "VERIFICATION QUESTION 2: What is the chemical symbol for water?",
        type: "multiple_choice",
        options: ["H2O", "CO2", "NaCl", "O2"],
        correctAnswer: "H2O",
        explanation: "Water is composed of hydrogen and oxygen",
      },
      {
        text: "VERIFICATION QUESTION 3: What is the square root of 144?",
        type: "multiple_choice",
        options: ["12", "10", "14", "16"],
        correctAnswer: "12",
        explanation: "12 × 12 = 144",
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

// 3. Get questions for the attempt and compare with original quiz
async function verifyQuestions(quiz, attemptId) {
  log.header("STEP 3: VERIFYING QUESTIONS");
  log.info(`Verifying questions for attempt ID: ${attemptId}`);

  try {
    // API Gateway call
    const apiResponse = await fetch(`${STUDY_API_URL}/${attemptId}/questions`);

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json().catch(() => ({}));
      throw new Error(
        `Failed to fetch questions from API: ${
          apiResponse.status
        } - ${JSON.stringify(errorData)}`
      );
    }

    const apiResult = await apiResponse.json();
    const apiQuestions = apiResult.data;

    log.info("Questions received from API Gateway:");
    apiQuestions.forEach((q, i) => {
      log.json(`API Question ${i + 1}`, {
        text: q.text,
        options: q.options,
      });
    });

    // Direct calls to services for comparison
    const contentResult = await debugServices.getQuizFromContentService(
      quiz.id
    );
    const contentQuestions = contentResult?.data?.questions || [];

    log.info("Questions from original quiz in content service:");
    contentQuestions.forEach((q, i) => {
      log.json(`Content Question ${i + 1}`, {
        text: q.text,
        options: q.options,
      });
    });

    const studyResult = await debugServices.getQuestionsFromStudyService(
      attemptId
    );
    const studyQuestions = studyResult?.data || [];

    log.info("Questions from direct study service:");
    studyQuestions.forEach((q, i) => {
      log.json(`Study Question ${i + 1}`, {
        text: q.text,
        options: q.options,
      });
    });

    // Check if API questions match our original questions
    let apiFail = false;
    apiQuestions.forEach((apiQuestion, i) => {
      const originalQuestion = quiz.questions[i];
      if (!originalQuestion) {
        log.error(`No original question found for index ${i}`);
        apiFail = true;
        return;
      }

      const textMatch = apiQuestion.text === originalQuestion.text;
      const optionsMatch =
        JSON.stringify(apiQuestion.options) ===
        JSON.stringify(originalQuestion.options);

      if (!textMatch || !optionsMatch) {
        log.error(`API Question ${i + 1} does not match original question`);
        log.json("Original", {
          text: originalQuestion.text,
          options: originalQuestion.options,
        });
        log.json("Received", {
          text: apiQuestion.text,
          options: apiQuestion.options,
        });
        apiFail = true;
      } else {
        log.success(`API Question ${i + 1} MATCH CONFIRMED`);
      }
    });

    // Final verdict
    if (apiFail) {
      log.error("VERIFICATION FAILED: Questions do not match original quiz");
      return false;
    } else {
      log.success("VERIFICATION PASSED: All questions match original quiz");
      return true;
    }
  } catch (error) {
    log.error(`Error verifying questions: ${error.message}`);
    return false;
  }
}

// Main function to run the test
async function runVerification() {
  try {
    log.header("STARTING QUESTION VERIFICATION TEST");

    // Create a quiz with distinctive questions
    const quiz = await createQuiz();
    const quizId = quiz.id;
    const totalQuestions = quiz.questions.length;

    // Create an attempt for this quiz
    const attempt = await startQuizAttempt(quizId, totalQuestions);
    const attemptId = attempt.id;

    // Verify questions match
    const verified = await verifyQuestions(quiz, attemptId);

    log.header("TEST COMPLETE");

    if (verified) {
      log.success(
        "🎉 SUCCESS: The quiz system correctly returns the original questions!"
      );
      return true;
    } else {
      log.error(
        "❌ FAILURE: The quiz system is not returning the correct questions."
      );
      return false;
    }
  } catch (error) {
    log.header("TEST FAILED");
    log.error(`Error running verification: ${error.message}`);
    return false;
  }
}

// Execute the verification
runVerification()
  .then((success) => {
    console.log("\n");
    if (success) {
      log.success("VERIFICATION SUCCESSFUL - The system is working correctly!");
      process.exit(0);
    } else {
      log.error("VERIFICATION FAILED - The system is not working correctly!");
      process.exit(1);
    }
  })
  .catch((err) => {
    log.error(`\nFATAL ERROR: ${err}`);
    process.exit(1);
  });
