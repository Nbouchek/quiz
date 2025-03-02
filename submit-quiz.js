#!/usr/bin/env node

/**
 * Quiz Submission CLI Tool
 *
 * This script allows users to:
 * 1. List available quizzes
 * 2. Start a quiz attempt
 * 3. Answer quiz questions
 * 4. Submit the quiz and see results
 */

import fetch from "node-fetch";
import readline from "readline";

// Configuration
const API_BASE_URL = "http://localhost:8082"; // Adjust based on your setup
const CONTENT_API_URL = `${API_BASE_URL}/content/quizzes`;
const STUDY_API_URL = `${API_BASE_URL}/study/attempts`; // Used for quiz attempts and operations
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001"; // Default test user

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}${question}${colors.reset} `, resolve);
  });
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

    console.log(`Found ${quizzes.length} quizzes:\n`);
    quizzes.forEach((quiz, index) => {
      console.log(`${index + 1}. ${colors.bright}${quiz.title}${colors.reset}`);
      console.log(`   ID: ${quiz.id}`);
      console.log(
        `   Questions: ${quiz.questions ? quiz.questions.length : "Unknown"}`
      );
      console.log(`   Description: ${quiz.description || "No description"}\n`);
    });

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
    const response = await fetch(`${STUDY_API_URL}/${attemptId}/questions`);

    if (!response.ok) {
      throw new Error(`Failed to fetch questions: ${response.status}`);
    }

    const result = await response.json();
    const questions = result.data || [];

    if (questions.length === 0) {
      printInfo("No questions were returned from the API");
    } else {
      printSuccess(`Loaded ${questions.length} questions`);
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
    const response = await fetch(`${STUDY_API_URL}/${attemptId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Failed to complete quiz: ${response.status}`);
    }

    const result = await response.json();
    printSuccess("Quiz completed successfully!");

    // Display results - use the actual response structure
    const attemptData = result.data || {};
    const score = attemptData.score || 0; // Score is a number, not an object
    const totalQuestions = attemptData.totalQuestions || 1;
    const correctAnswers = Math.round(score * totalQuestions); // Convert score to number of correct answers
    const percentage = (score * 100).toFixed(2); // Score appears to be a fraction already

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

// Main function to run the quiz flow
async function runQuiz() {
  printHeader("QUIZ SUBMISSION TOOL");

  try {
    // 1. List quizzes
    const quizzes = await listQuizzes();

    if (quizzes.length === 0) {
      printError("No quizzes available. Please create a quiz first.");
      rl.close();
      return;
    }

    // 2. Select a quiz
    const selection = await askQuestion(
      `Enter the number of the quiz you want to take (1-${quizzes.length}):`
    );
    const index = parseInt(selection, 10) - 1;

    if (isNaN(index) || index < 0 || index >= quizzes.length) {
      printError("Invalid selection. Please run the script again.");
      rl.close();
      return;
    }

    const selectedQuiz = quizzes[index];
    printInfo(`You selected: ${selectedQuiz.title}`);

    // 3. Start the quiz attempt
    const totalQuestions = selectedQuiz.questions
      ? selectedQuiz.questions.length
      : 5;
    const attempt = await startQuizAttempt(selectedQuiz.id, totalQuestions);

    // 4. Get questions
    const questions = await getQuestionsForAttempt(attempt.id);

    if (questions.length === 0) {
      printError("No questions available for this quiz.");
      rl.close();
      return;
    }

    // 5. Answer questions one by one
    printHeader("ANSWERING QUESTIONS");

    for (let i = 0; i < questions.length; i++) {
      const question = questions[i];
      console.log(`\nQuestion ${i + 1} of ${questions.length}:`);

      // Make sure question.text exists
      if (!question.text) {
        printError("Question text is missing!");
        console.log(
          `${colors.bright}[No question text available]${colors.reset}`
        );
      } else {
        console.log(`${colors.bright}${question.text}${colors.reset}`);
      }

      // For multiple choice questions, show options
      if (
        question.options &&
        Array.isArray(question.options) &&
        question.options.length > 0
      ) {
        console.log("\nOptions:");
        question.options.forEach((option, idx) => {
          console.log(`  ${String.fromCharCode(65 + idx)}. ${option}`);
        });

        const answerLetter = await askQuestion(
          "Enter your answer (A, B, C, etc.):"
        );
        const letterIndex = answerLetter.toUpperCase().charCodeAt(0) - 65;

        if (letterIndex >= 0 && letterIndex < question.options.length) {
          const answerValue = question.options[letterIndex];
          await submitAnswer(attempt.id, question.id, answerValue);
          printSuccess("Answer submitted!");
        } else {
          printError("Invalid option. Skipping this question.");
        }
      } else {
        // For text questions or if options are missing
        const answer = await askQuestion("Enter your answer:");
        await submitAnswer(attempt.id, question.id, answer);
        printSuccess("Answer submitted!");
      }
    }

    // 6. Complete the quiz
    await completeQuizAttempt(attempt.id);
  } catch (error) {
    printError(`An error occurred: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Start the quiz application
runQuiz().catch((error) => {
  console.error("Unhandled error:", error);
  rl.close();
});
