#!/bin/bash

# Quiz Submission Test Script
# This script tests the quiz submission flow using curl.

# Configuration
API_BASE_URL="http://localhost:8082"
CONTENT_API_URL="${API_BASE_URL}/content/quizzes"
STUDY_API_URL="${API_BASE_URL}/study/attempts"
TEST_USER_ID="00000000-0000-0000-0000-000000000001"

# Color setup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== QUIZ SUBMISSION TEST ===${NC}\n"

# 1. Get available quizzes
echo -e "${YELLOW}Fetching available quizzes...${NC}"
quizzes_response=$(curl -s "${CONTENT_API_URL}")
echo "Response: $quizzes_response"
echo ""

# Extract the first quiz ID from the response
QUIZ_ID=$(echo $quizzes_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$QUIZ_ID" ]; then
  echo -e "${RED}Failed to find a quiz ID.${NC}"
  exit 1
fi

echo -e "${GREEN}Using quiz ID: $QUIZ_ID${NC}"
echo ""

# For testing purposes, we'll just create a quiz attempt directly
echo -e "${YELLOW}Creating a quiz attempt...${NC}"

attempt_payload='{
  "userId": "'${TEST_USER_ID}'",
  "quizId": "'${QUIZ_ID}'",
  "totalQuestions": 3
}'

echo "Request payload: $attempt_payload"

attempt_response=$(curl -s -X POST "${STUDY_API_URL}" \
  -H "Content-Type: application/json" \
  -d "$attempt_payload")

echo "Response: $attempt_response"
echo ""

# Extract attempt ID (simplified for testing)
ATTEMPT_ID=$(echo $attempt_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$ATTEMPT_ID" ]; then
  echo -e "${RED}Failed to create quiz attempt.${NC}"
  exit 1
fi

echo -e "${GREEN}Created quiz attempt with ID: $ATTEMPT_ID${NC}"
echo ""

# 2. Get questions for the attempt
echo -e "${YELLOW}Fetching questions for the attempt...${NC}"
questions_response=$(curl -s "${STUDY_API_URL}/${ATTEMPT_ID}/questions")
echo "Response: $questions_response"
echo ""

# Extract the first question ID from the response
QUESTION_ID=$(echo $questions_response | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$QUESTION_ID" ]; then
  echo -e "${RED}Failed to find a question ID.${NC}"
  echo -e "${YELLOW}Using a placeholder question ID instead.${NC}"
  QUESTION_ID="00000000-0000-0000-0000-000000000001"
else
  echo -e "${GREEN}Using question ID: $QUESTION_ID${NC}"
fi
echo ""

# 3. Submit an answer
echo -e "${YELLOW}Submitting an answer...${NC}"

answer_payload='{
  "questionId": "'${QUESTION_ID}'",
  "answer": "Paris",
  "isCorrect": true
}'

echo "Request payload: $answer_payload"

answer_response=$(curl -s -X POST "${STUDY_API_URL}/${ATTEMPT_ID}/answers" \
  -H "Content-Type: application/json" \
  -d "$answer_payload")

echo "Response: $answer_response"
echo ""

# 4. Complete the quiz
echo -e "${YELLOW}Completing the quiz...${NC}"
complete_response=$(curl -s -X POST "${STUDY_API_URL}/${ATTEMPT_ID}/complete")
echo "Response: $complete_response"
echo ""

echo -e "${GREEN}Quiz submission test completed.${NC}" 