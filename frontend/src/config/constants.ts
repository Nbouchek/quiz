export const API_BASE_URL =
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_API_URL
    : 'http://api-gateway:8082'
export const STUDY_API_URL = `${API_BASE_URL}/study`
export const QUIZ_API_URL = `${API_BASE_URL}/content/quizzes`
export const USER_API_URL = `${API_BASE_URL}/users`
export const AI_API_URL = `${API_BASE_URL}/ai`
