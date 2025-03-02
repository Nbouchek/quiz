// Import dependencies using dynamic imports
import("node-fetch").then((fetchModule) => {
  const fetch = fetchModule.default;
  import("uuid").then((uuidModule) => {
    const { v4: uuidv4 } = uuidModule;
    runTest(fetch, uuidv4);
  });
});

// Configuration
const CONTENT_API_URL = "http://localhost:8081";
const STUDY_API_URL = "http://localhost:8084";

// Run all steps
async function runTest(fetch, uuidv4) {
  try {
    // Create two quizzes with clearly different questions
    const quizData1 = {
      title: `Quiz ONE - ${new Date().toISOString()}`,
      description: "First test quiz with unique questions",
      topicId: "00000000-0000-0000-0000-000000000001",
      creatorId: "00000000-0000-0000-0000-000000000001",
      questions: [
        {
          text: `QUIZ 1 - Question 1`,
          type: "multiple_choice",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          explanation: "This is explanation for Quiz 1 Question 1",
        },
        {
          text: `QUIZ 1 - Question 2`,
          type: "multiple_choice",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option B",
          explanation: "This is explanation for Quiz 1 Question 2",
        },
      ],
    };

    const quizData2 = {
      title: `Quiz TWO - ${new Date().toISOString()}`,
      description: "Second test quiz with different questions",
      topicId: "00000000-0000-0000-0000-000000000001",
      creatorId: "00000000-0000-0000-0000-000000000001",
      questions: [
        {
          text: `QUIZ 2 - Question 1`,
          type: "multiple_choice",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option A",
          explanation: "This is explanation for Quiz 2 Question 1",
        },
        {
          text: `QUIZ 2 - Question 2`,
          type: "multiple_choice",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswer: "Option B",
          explanation: "This is explanation for Quiz 2 Question 2",
        },
      ],
    };

    // Create first quiz
    console.log("Creating Quiz ONE...");
    const quizId1 = await createQuiz(fetch, quizData1);
    console.log(`\nCreated Quiz ONE with ID: ${quizId1}`);

    // Create second quiz
    console.log("\nCreating Quiz TWO...");
    const quizId2 = await createQuiz(fetch, quizData2);
    console.log(`\nCreated Quiz TWO with ID: ${quizId2}`);

    // Test getting questions directly from content service
    console.log("\n---TESTING CONTENT SERVICE---");

    console.log(
      `\nGetting questions for Quiz ONE (${quizId1}) from content service:`
    );
    const contentQuestions1 = await fetch(
      `${CONTENT_API_URL}/quizzes/${quizId1}/questions`
    ).then((r) => r.json());
    console.log(
      `Content service returned for Quiz ONE:`,
      contentQuestions1.data.map((q) => q.text)
    );

    console.log(
      `\nGetting questions for Quiz TWO (${quizId2}) from content service:`
    );
    const contentQuestions2 = await fetch(
      `${CONTENT_API_URL}/quizzes/${quizId2}/questions`
    ).then((r) => r.json());
    console.log(
      `Content service returned for Quiz TWO:`,
      contentQuestions2.data.map((q) => q.text)
    );

    // Create attempts and check study service
    console.log("\n---TESTING STUDY SERVICE---");

    // Create attempt for Quiz ONE
    console.log(`\nCreating attempt for Quiz ONE (${quizId1})...`);
    const attemptData1 = {
      userId: "00000000-0000-0000-0000-000000000001",
      quizId: quizId1,
      totalQuestions: 2,
    };
    console.log("Attempt data:", attemptData1);

    const attemptResponse1 = await fetch(`${STUDY_API_URL}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attemptData1),
    });

    if (!attemptResponse1.ok) {
      const error = await attemptResponse1.text();
      console.error("Failed to create attempt for Quiz ONE:", error);
      throw new Error(`Failed to create attempt for Quiz ONE: ${error}`);
    }

    const attempt1 = await attemptResponse1.json();
    const attemptId1 = attempt1.data.id;
    console.log(`Created attempt for Quiz ONE with ID: ${attemptId1}`);

    // Get questions from study service for Quiz ONE
    console.log(
      `\nGetting questions for Quiz ONE attempt (${attemptId1}) from study service:`
    );
    const studyQuestions1 = await fetch(
      `${STUDY_API_URL}/attempts/${attemptId1}/questions`
    ).then((r) => r.json());
    console.log(
      `Study service returned for Quiz ONE:`,
      studyQuestions1.data.map((q) => q.text)
    );

    // Create attempt for Quiz TWO
    console.log(`\nCreating attempt for Quiz TWO (${quizId2})...`);
    const attemptData2 = {
      userId: "00000000-0000-0000-0000-000000000001",
      quizId: quizId2,
      totalQuestions: 2,
    };
    console.log("Attempt data:", attemptData2);

    const attemptResponse2 = await fetch(`${STUDY_API_URL}/attempts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(attemptData2),
    });

    if (!attemptResponse2.ok) {
      const error = await attemptResponse2.text();
      console.error("Failed to create attempt for Quiz TWO:", error);
      throw new Error(`Failed to create attempt for Quiz TWO: ${error}`);
    }

    const attempt2 = await attemptResponse2.json();
    const attemptId2 = attempt2.data.id;
    console.log(`Created attempt for Quiz TWO with ID: ${attemptId2}`);

    // Get questions from study service for Quiz TWO
    console.log(
      `\nGetting questions for Quiz TWO attempt (${attemptId2}) from study service:`
    );
    const studyQuestions2 = await fetch(
      `${STUDY_API_URL}/attempts/${attemptId2}/questions`
    ).then((r) => r.json());
    console.log(
      `Study service returned for Quiz TWO:`,
      studyQuestions2.data.map((q) => q.text)
    );

    // Summary
    console.log("\n--- SUMMARY ---");
    console.log("Quiz ONE ID:", quizId1);
    console.log("Quiz TWO ID:", quizId2);
    console.log(
      "\nContent service questions for Quiz ONE:",
      contentQuestions1.data.map((q) => q.text)
    );
    console.log(
      "Content service questions for Quiz TWO:",
      contentQuestions2.data.map((q) => q.text)
    );
    console.log(
      "\nStudy service questions for Quiz ONE:",
      studyQuestions1.data.map((q) => q.text)
    );
    console.log(
      "Study service questions for Quiz TWO:",
      studyQuestions2.data.map((q) => q.text)
    );

    // Check if study service is returning the correct questions
    const isCorrect1 =
      JSON.stringify(contentQuestions1.data.map((q) => q.text)) ===
      JSON.stringify(studyQuestions1.data.map((q) => q.text));
    const isCorrect2 =
      JSON.stringify(contentQuestions2.data.map((q) => q.text)) ===
      JSON.stringify(studyQuestions2.data.map((q) => q.text));

    console.log("\nDo quiz questions match?");
    console.log("Quiz ONE matches:", isCorrect1 ? "YES" : "NO");
    console.log("Quiz TWO matches:", isCorrect2 ? "YES" : "NO");

    console.log("\nTest completed.");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Step 1: Create a new quiz with unique questions
async function createQuiz(fetch, quizData) {
  try {
    const response = await fetch(`${CONTENT_API_URL}/quizzes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quizData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create quiz: ${error}`);
    }

    const result = await response.json();
    return result.data.id;
  } catch (error) {
    console.error("Error creating quiz:", error);
    throw error;
  }
}

const { v4: uuidv4 } = require("uuid");

// Configuration
// Using different variable name to avoid duplicate declaration
const STUDY_SERVICE_URL = "http://localhost:8084";
const QUIZ_API_URL = "http://localhost:8081";

async function debugStudyService() {
  console.log("=== Debugging Study Service ===");

  try {
    // Check service health
    console.log("\nChecking study service health...");
    const healthResponse = await fetch(`${STUDY_SERVICE_URL}/health`);

    if (!healthResponse.ok) {
      console.error(
        "❌ Study service is not running or not responding correctly"
      );
      return;
    }

    console.log("✅ Study service is running");

    // 2. Create a test quiz attempt
    console.log("\nCreating a test quiz attempt...");

    const testQuizId = "219ed04d-9f05-4ca7-ac87-f5b087423335"; // Use the quiz ID from your error message
    const attemptPayload = {
      userId: "00000000-0000-0000-0000-000000000001", // Test user ID
      quizId: testQuizId,
      totalQuestions: 3,
    };

    const createAttemptResponse = await fetch(`${STUDY_SERVICE_URL}/attempts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(attemptPayload),
    });

    if (!createAttemptResponse.ok) {
      const errorData = await createAttemptResponse.json();
      console.error("❌ Failed to create quiz attempt:", errorData);
      return;
    }

    const attemptData = await createAttemptResponse.json();
    console.log("✅ Quiz attempt created:", attemptData);

    const attemptId = attemptData.data.id;

    // 3. Get questions for the attempt
    console.log("\nGetting questions for the attempt...");

    const questionsResponse = await fetch(
      `${STUDY_SERVICE_URL}/attempts/${attemptId}/questions`
    );

    if (!questionsResponse.ok) {
      const errorData = await questionsResponse.json();
      console.error("❌ Failed to get questions:", errorData);
      return;
    }

    const questionsData = await questionsResponse.json();
    console.log("✅ Questions retrieved:", questionsData);

    if (!questionsData.data || questionsData.data.length === 0) {
      console.error("❌ No questions found for the attempt");
      return;
    }

    // 4. Submit an answer for the first question
    console.log("\nSubmitting an answer for the first question...");

    const firstQuestion = questionsData.data[0];
    const answerPayload = {
      questionId: firstQuestion.id,
      answer: firstQuestion.options[0], // Using the first option as the answer
      isCorrect: true, // Assuming the first option is correct for testing
    };

    console.log("Answer payload:", answerPayload);

    const submitAnswerResponse = await fetch(
      `${STUDY_SERVICE_URL}/attempts/${attemptId}/answers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(answerPayload),
      }
    );

    console.log("Response status:", submitAnswerResponse.status);

    const responseText = await submitAnswerResponse.text();
    console.log("Raw response:", responseText);

    let answerResponseData;
    try {
      answerResponseData = JSON.parse(responseText);
      console.log("Answer submission response:", answerResponseData);
    } catch (e) {
      console.error("❌ Failed to parse response as JSON:", e);
      return;
    }

    if (!submitAnswerResponse.ok) {
      console.error("❌ Failed to submit answer:", answerResponseData);

      // Additional debugging - inspect database tables
      console.log("\nTrying to diagnose the issue:");

      // 5. Check if the attempt exists in the database
      console.log("\nVerifying attempt still exists...");
      const getAttemptResponse = await fetch(
        `${STUDY_SERVICE_URL}/attempts/${attemptId}`
      );

      if (!getAttemptResponse.ok) {
        console.error(
          "❌ Could not retrieve attempt after answer submission attempt"
        );
      } else {
        const attemptAfterSubmit = await getAttemptResponse.json();
        console.log("✅ Attempt still exists:", attemptAfterSubmit);
      }

      return;
    }

    console.log("✅ Answer submitted successfully!");
  } catch (error) {
    console.error("Error during debugging:", error);
  }
}

// Run the debugging function
debugStudyService();
