#!/usr/bin/env node

/**
 * Test script for submit-quiz.js
 *
 * This script automatically tests the quiz submission flow:
 * 1. Fetches available quizzes
 * 2. Starts a quiz attempt for the first quiz
 * 3. Gets and answers questions
 * 4. Completes the quiz
 */

import fetch from "node-fetch";

// Configuration
const API_BASE_URL = "http://localhost:8082"; // Adjust based on your setup
const CONTENT_API_URL = `${API_BASE_URL}/content/quizzes`;
const STUDY_API_URL = `${API_BASE_URL}/study/attempts`;
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001"; // Default test user

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
  console.log(`${colors.cyan}${text}${colors.reset}`);
}

// 1. List available quizzes
async function listQuizzes() {
  printHeader("AVAILABLE QUIZZES");

  try {
    const response = await fetch(CONTENT_API_URL);

    if (!response.ok) {
      throw new Error(`Failed to fetch quizzes: ${response.status}`);
    }

    const result = await response.json();
    const quizzes = result.data || [];

    if (quizzes.length === 0) {
      printInfo("No quizzes available.");
      return [];
    }

    console.log(`Found ${quizzes.length} quizzes:`);
    quizzes.forEach((quiz, index) => {
      if (index < 3) {
        // Only show first 3 quizzes to keep output clean
        console.log(
          `${index + 1}. ${colors.bright}${quiz.title}${colors.reset}`
        );
        console.log(`   ID: ${quiz.id}`);
        console.log(
          `   Questions: ${quiz.questions ? quiz.questions.length : "Unknown"}`
        );
      }
    });
    if (quizzes.length > 3) {
      console.log(`...and ${quizzes.length - 3} more quizzes`);
    }

    return quizzes;
  } catch (error) {
    printError(`Error fetching quizzes: ${error.message}`);
    return [];
  }
}

// 2. Start a quiz attempt
async function startQuizAttempt(quizId, totalQuestions) {
  printHeader(`STARTING QUIZ (ID: ${quizId})`);

  try {
    const response = await fetch(STUDY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: TEST_USER_ID,
        quizId: quizId,
        totalQuestions: totalQuestions,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start quiz: ${response.status}`);
    }

    const result = await response.json();
    printSuccess("Quiz attempt started successfully!");
    console.log(`Attempt ID: ${result.data.id}`);

    return result.data;
  } catch (error) {
    printError(`Error starting quiz: ${error.message}`);
    throw error;
  }
}

// 3. Get questions for an attempt
async function getQuestionsForAttempt(attemptId) {
  printInfo("Loading questions...");

  try {
    console.log(`Fetching questions for attempt: ${attemptId}`);
    const response = await fetch(`${STUDY_API_URL}/${attemptId}/questions`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to fetch questions: ${response.status} - ${errorText}`
      );
    }

    // Get raw response for debugging
    const rawText = await response.text();
    console.log("Raw questions response:", rawText);

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error(
        `Failed to parse questions response: ${parseError.message}`
      );
      throw new Error("Invalid JSON in questions response");
    }

    const questions = result.data || [];

    printSuccess(`Loaded ${questions.length} questions`);
    console.log("Questions data structure:");
    console.log(JSON.stringify(questions, null, 2));

    // Check if questions have the required structure
    if (questions.length > 0) {
      const firstQuestion = questions[0];
      console.log("First question properties:");
      console.log("- id:", firstQuestion.id);
      console.log("- text:", firstQuestion.text);
      console.log("- options:", firstQuestion.options);
      console.log("- type:", firstQuestion.type);

      if (!firstQuestion.text) {
        printError("Question text is missing!");
      }
      if (
        !firstQuestion.options ||
        !Array.isArray(firstQuestion.options) ||
        firstQuestion.options.length === 0
      ) {
        printError("Question options are missing or invalid!");
      }
    }

    return questions;
  } catch (error) {
    printError(`Error loading questions: ${error.message}`);
    throw error;
  }
}

// 4. Submit an answer
async function submitAnswer(attemptId, questionId, answer) {
  try {
    const response = await fetch(`${STUDY_API_URL}/${attemptId}/answers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: questionId,
        answer: answer,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to submit answer: ${response.status}`);
    }

    const result = await response.json();
    printSuccess(`Answer "${answer}" submitted for question ${questionId}`);
    return result.data;
  } catch (error) {
    printError(`Error submitting answer: ${error.message}`);
    throw error;
  }
}

// 5. Complete a quiz attempt
async function completeQuizAttempt(attemptId) {
  printHeader("COMPLETING QUIZ");

  try {
    console.log(`Completing quiz attempt with ID: ${attemptId}`);

    const response = await fetch(`${STUDY_API_URL}/${attemptId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Failed to complete quiz: ${response.status} - ${errorText}`
      );
    }

    // Get the raw response text for debugging
    const rawText = await response.text();
    console.log(`Raw completion response: ${rawText}`);

    let result;
    try {
      result = JSON.parse(rawText);
    } catch (parseError) {
      console.error(
        `Failed to parse completion response: ${parseError.message}`
      );
      console.error(`Raw text that couldn't be parsed: ${rawText}`);
      throw new Error("Invalid JSON in completion response");
    }

    printSuccess("Quiz completed successfully!");
    console.log("Full completion response:");
    console.log(JSON.stringify(result, null, 2));

    // Display results using the actual API response structure
    const attemptData = result.data || {};
    // From the observed API response, score is a number (fraction) not an object
    const score = typeof attemptData.score === "number" ? attemptData.score : 0;
    const totalQuestions = attemptData.totalQuestions || 1;
    // Calculate correct answers based on score percentage and total questions
    const correctAnswers = Math.round(score * totalQuestions);
    const percentage = (score * 100).toFixed(2);

    console.log("Calculated score data:");
    console.log(`- Raw score from API: ${score}`);
    console.log(`- Total questions: ${totalQuestions}`);
    console.log(`- Calculated correct answers: ${correctAnswers}`);
    console.log(`- Percentage: ${percentage}%`);

    console.log("\n===============================");
    console.log(`${colors.bright}QUIZ RESULTS${colors.reset}`);
    console.log("===============================");
    console.log(
      `Correct answers: ${colors.green}${correctAnswers}${colors.reset}`
    );
    console.log(`Total questions: ${totalQuestions}`);
    console.log(`Score: ${colors.bright}${percentage}%${colors.reset}`);
    console.log("===============================\n");

    return result.data;
  } catch (error) {
    printError(`Error completing quiz: ${error.message}`);
    throw error;
  }
}

// Main function to run the quiz flow automatically
async function testQuizFlow() {
  printHeader("QUIZ SUBMISSION TEST");

  try {
    // 1. List quizzes
    const quizzes = await listQuizzes();

    if (quizzes.length === 0) {
      printError("No quizzes available. Test cannot continue.");
      return;
    }

    // 2. Select the first quiz
    const selectedQuiz = quizzes[0];
    printInfo(
      `Selected for testing: ${selectedQuiz.title} (ID: ${selectedQuiz.id})`
    );

    // 3. Start the quiz attempt
    const totalQuestions = selectedQuiz.questions
      ? selectedQuiz.questions.length
      : 1;
    const attempt = await startQuizAttempt(selectedQuiz.id, totalQuestions);

    // 4. Get questions
    const questions = await getQuestionsForAttempt(attempt.id);

    if (questions.length === 0) {
      printError("No questions available for this quiz. Test cannot continue.");
      return;
    }

    // 5. Answer questions one by one with default answers
    printHeader("ANSWERING QUESTIONS");

    for (const question of questions) {
      console.log(`Question: ${colors.bright}${question.text}${colors.reset}`);

      // For multiple choice questions, pick the first option
      if (question.options && question.options.length > 0) {
        console.log(`Options: ${question.options.join(", ")}`);
        const answer = question.options[0];
        await submitAnswer(attempt.id, question.id, answer);
      } else {
        // For text questions, use a default answer
        await submitAnswer(attempt.id, question.id, "Test answer");
      }
    }

    // 6. Complete the quiz
    await completeQuizAttempt(attempt.id);

    printSuccess("QUIZ FLOW TESTING COMPLETED SUCCESSFULLY!");
  } catch (error) {
    printError(`Test failed: ${error.message}`);
    console.error(error);
  }
}

// Start the test
testQuizFlow().catch((error) => {
  console.error("Unhandled error:", error);
});
