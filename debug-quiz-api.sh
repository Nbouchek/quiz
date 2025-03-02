#!/bin/bash

echo "=== Debug Quiz API ==="

# Define URLs
STUDY_API_URL="http://localhost:8084"
QUIZ_API_URL="http://localhost:8081"

# Step 1: Check if study service is running
echo -e "\nChecking if study service is running..."
health_response=$(curl -s "${STUDY_API_URL}/health")
echo "Health response: ${health_response}"

if [[ "${health_response}" != *"ok"* ]]; then
  echo "❌ Study service is not running properly"
  exit 1
fi

echo "✅ Study service is running"

# Step 2: Create a test quiz attempt
echo -e "\nCreating a test quiz attempt..."
QUIZ_ID="219ed04d-9f05-4ca7-ac87-f5b087423335" # Use the quiz ID from the error message

attempt_payload='{
  "userId": "00000000-0000-0000-0000-000000000001",
  "quizId": "'"${QUIZ_ID}"'",
  "totalQuestions": 3
}'

echo "Attempt payload: ${attempt_payload}"

attempt_response=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "${attempt_payload}" \
  "${STUDY_API_URL}/attempts")

echo "Attempt response: ${attempt_response}"

# Extract attempt ID from the response
ATTEMPT_ID=$(echo "${attempt_response}" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "${ATTEMPT_ID}" ]; then
  echo "❌ Failed to extract attempt ID from response"
  exit 1
fi

echo "✅ Created attempt with ID: ${ATTEMPT_ID}"

# Step 3: Get questions for the attempt
echo -e "\nGetting questions for the attempt..."
questions_response=$(curl -s "${STUDY_API_URL}/attempts/${ATTEMPT_ID}/questions")
echo "Questions response: ${questions_response}"

# Extract the first question ID from the response
QUESTION_ID=$(echo "${questions_response}" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "${QUESTION_ID}" ]; then
  echo "❌ Failed to extract question ID from response"
  exit 1
fi

echo "✅ Got question with ID: ${QUESTION_ID}"

# Step 4: Submit an answer
echo -e "\nSubmitting an answer..."

answer_payload='{
  "questionId": "'"${QUESTION_ID}"'",
  "answer": "Paris",
  "isCorrect": true
}'

echo "Answer payload: ${answer_payload}"

answer_response=$(curl -i -s -X POST \
  -H "Content-Type: application/json" \
  -d "${answer_payload}" \
  "${STUDY_API_URL}/attempts/${ATTEMPT_ID}/answers")

echo -e "\nAnswer submission response:"
echo "${answer_response}"

# Check if the answer submission was successful
if [[ "${answer_response}" == *"200 OK"* ]]; then
  echo "✅ Answer submitted successfully!"
else
  echo "❌ Failed to submit answer"
  
  # Additional verification
  echo -e "\nVerifying attempt still exists..."
  verify_response=$(curl -s "${STUDY_API_URL}/attempts/${ATTEMPT_ID}")
  echo "Verification response: ${verify_response}"
fi

echo -e "\nDebug script completed!" 