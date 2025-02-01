// Environment variables type definitions
export interface Env {
  NODE_ENV: 'development' | 'production' | 'test'
  API_URL: string
  NEXTAUTH_URL: string
  NEXTAUTH_SECRET: string
  DATABASE_URL: string
}

// Quiz-related types
export interface Quiz {
  id: string
  title: string
  description: string
  topicId: string
  creatorId: string
  questions: Question[]
  createdAt: string
  updatedAt: string
}

export interface Question {
  id: string
  quizId: string
  text: string
  type: 'multiple_choice' | 'true_false' | 'open_ended'
  options: string[]
  correctAnswer: string
  explanation?: string
  createdAt: string
  updatedAt: string
}

export interface Option {
  id: string
  text: string
}

export interface QuizAttempt {
  id: string
  quizId: string
  userId: string
  score: number
  answers: Answer[]
  startedAt: string
  completedAt?: string
}

export interface Answer {
  questionId: string
  selectedOptionId?: string
  textAnswer?: string
  isCorrect: boolean
}

// User-related types
export interface User {
  id: string
  name: string
  email: string
  image?: string
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

// API response types
export interface ApiResponse<T> {
  data?: T
  message?: string
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

// Common utility types
export type Nullable<T> = T | null
export type Optional<T> = T | undefined
export type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export interface CreateQuizInput {
  title: string
  description: string
  topicId?: string
  questions: Array<Omit<Question, 'id' | 'quizId' | 'createdAt' | 'updatedAt'>>
}

export interface UpdateQuizInput {
  title?: string
  description?: string
  questions?: Array<Omit<Question, 'quizId' | 'createdAt' | 'updatedAt'>>
}
