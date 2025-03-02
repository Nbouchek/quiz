export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://localhost:8082'

// For direct service access (bypassing API gateway)
const DIRECT_MODE = false

// Study service (handles attempts, questions, answers)
export const STUDY_API_URL = DIRECT_MODE
  ? 'http://localhost:8084'
  : `${API_BASE_URL}/study`

// Content service (handles quizzes, topics)
export const QUIZ_API_URL = DIRECT_MODE
  ? 'http://localhost:8081'
  : `${API_BASE_URL}/content`

// User service (handles user authentication and management)
export const USER_API_URL = DIRECT_MODE
  ? 'http://localhost:8080'
  : `${API_BASE_URL}/users`

// AI service (handles AI-related features)
export const AI_API_URL = DIRECT_MODE
  ? 'http://localhost:8083'
  : `${API_BASE_URL}/ai`
