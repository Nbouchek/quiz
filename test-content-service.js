// Script to test the content service

const fetch = require("node-fetch");

// Test access to hardcoded quiz ID
async function testContentService() {
  console.log("===== TESTING CONTENT SERVICE =====");

  // Create a list of IDs to test
  const testIds = [
    "test-quiz-id",
    "694f02d2-8109-474c-8dc9-f3507a80abaa", // Previously identified default quiz ID
    "a7c4e32f-4c8b-43b1-afe6-27b2c6bfc0d8", // Another ID from debug logs
    "11111111-1111-1111-1111-111111111111", // ID from database
  ];

  // Also test a newly created quiz
  try {
    // Generate a unique quiz title with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const quizTitle = `Debug Quiz ${timestamp}`;

    const quizData = {
      title: quizTitle,
      description: "This quiz is for debugging purposes",
      topicId: null,
      creatorId: "00000000-0000-0000-0000-000000000001",
      questions: [
        {
          text: "DEBUG QUESTION 1",
          type: "multiple_choice",
          options: ["Option 1", "Option 2", "Option 3", "Option 4"],
          correctAnswer: "Option 1",
          explanation: "Debug explanation",
        },
      ],
    };

    console.log("Creating a new quiz for testing...");
    const response = await fetch("http://localhost:8082/content/quizzes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(quizData),
    });

    if (!response.ok) {
      throw new Error(`Failed to create quiz: ${response.status}`);
    }

    const result = await response.json();
    console.log("Created quiz with ID:", result.data.id);

    // Add the new quiz ID to the test list
    testIds.push(result.data.id);
  } catch (error) {
    console.error("Error creating test quiz:", error);
  }

  // Test each ID to see what the content service returns
  for (const id of testIds) {
    try {
      console.log(`\n\nTesting quiz ID: ${id}`);

      // Test content service directly
      const contentUrl = `http://localhost:8081/quizzes/${id}`;
      console.log(`Fetching from content service: ${contentUrl}`);
      const contentResponse = await fetch(contentUrl);

      if (contentResponse.ok) {
        const contentData = await contentResponse.json();
        console.log(
          "Content service response:",
          contentData.success ? "SUCCESS" : "FAILED"
        );
        console.log("Quiz title:", contentData.data?.title || "N/A");
        console.log(
          "Number of questions:",
          contentData.data?.questions?.length || 0
        );
        if (contentData.data?.questions?.length > 0) {
          console.log("First question:", contentData.data.questions[0].text);
        }
      } else {
        console.log(
          `Content service returned status ${contentResponse.status}`
        );
        try {
          const errorData = await contentResponse.json();
          console.log("Error:", errorData);
        } catch (e) {
          console.log("Couldn't parse error response");
        }
      }

      // Test the study service questions endpoint
      console.log("\nCreating an attempt for this quiz...");
      const attemptResponse = await fetch("http://localhost:8084/attempts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: "00000000-0000-0000-0000-000000000001",
          quizId: id,
          totalQuestions: 3,
        }),
      });

      if (attemptResponse.ok) {
        const attemptData = await attemptResponse.json();
        const attemptId = attemptData.data.id;
        console.log("Created attempt ID:", attemptId);

        // Get questions for this attempt
        const questionsUrl = `http://localhost:8084/attempts/${attemptId}/questions`;
        console.log(`Fetching questions: ${questionsUrl}`);
        const questionsResponse = await fetch(questionsUrl);

        if (questionsResponse.ok) {
          const questionsData = await questionsResponse.json();
          console.log(
            "Study service response:",
            questionsData.success ? "SUCCESS" : "FAILED"
          );
          console.log(
            "Number of questions returned:",
            questionsData.data?.length || 0
          );
          if (questionsData.data?.length > 0) {
            console.log("First question:", questionsData.data[0].text);
          }
        } else {
          console.log(
            `Study service returned status ${questionsResponse.status}`
          );
          try {
            const errorData = await questionsResponse.json();
            console.log("Error:", errorData);
          } catch (e) {
            console.log("Couldn't parse error response");
          }
        }
      } else {
        console.log(
          `Failed to create attempt, status: ${attemptResponse.status}`
        );
      }
    } catch (error) {
      console.error(`Error testing quiz ID ${id}:`, error);
    }
  }
}

// Run the test
testContentService().catch(console.error);
