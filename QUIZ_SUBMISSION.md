# Quiz Submission via Terminal

This document explains how to submit quizzes from the terminal using the QuizApp system.

## Prerequisites

- Node.js 14+ installed
- Docker and Docker Compose installed (if you need to run services locally)
- Quiz API services running (either locally or remotely)

## Quick Start

The simplest way to submit a quiz is to use the shell script wrapper:

```bash
./submit-quiz.sh
```

This script will:

1. Check if necessary services are running
2. Start services if needed (via Docker Compose)
3. Launch the quiz submission tool

## Manual Process

If you prefer to run things manually:

1. Ensure the API services are running:

   ```bash
   docker-compose up -d
   ```

2. Run the quiz submission tool directly:
   ```bash
   node ./submit-quiz.js
   ```

## How It Works

The quiz submission tool provides an interactive terminal interface that allows you to:

1. View available quizzes
2. Select a quiz to attempt
3. Answer questions one by one
4. Submit your answers and see your score

## Troubleshooting

If you encounter issues:

1. **Services unavailable**: Ensure docker-compose is running correctly by checking `docker-compose ps` or `docker ps`.

2. **Connection errors**: Check the API URLs in the submit-quiz.js file. By default, they're configured for local development at http://localhost:8082.

3. **Dependency errors**: Make sure node-fetch is installed by running:
   ```bash
   npm install node-fetch@2 --save
   ```

## Customization

To modify the user ID or API endpoints, edit the constants at the top of the `submit-quiz.js` file:

```javascript
// Configuration
const API_BASE_URL = "http://localhost:8082"; // Adjust based on your setup
const CONTENT_API_URL = `${API_BASE_URL}/content/quizzes`;
const STUDY_API_URL = `${API_BASE_URL}/study/attempts`;
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001"; // Default test user
```
