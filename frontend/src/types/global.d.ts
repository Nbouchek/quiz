declare global {
  // Environment variables type definitions
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test'
      API_URL: string
      NEXTAUTH_URL: string
      NEXTAUTH_SECRET: string
      DATABASE_URL: string
    }
  }

  // Quiz-related types
  interface Quiz {
    id: string
    title: string
    description: string
    questions: Question[]
    createdAt: string
    updatedAt: string
    createdBy: string
  }

  interface Question {
    id: string
    text: string
    options: Option[]
    correctOptionId: string
    explanation?: string
    type: 'multiple_choice' | 'true_false' | 'open_ended'
  }

  interface Option {
    id: string
    text: string
  }

  interface QuizAttempt {
    id: string
    quizId: string
    userId: string
    score: number
    answers: Answer[]
    startedAt: string
    completedAt?: string
  }

  interface Answer {
    questionId: string
    selectedOptionId?: string
    textAnswer?: string
    isCorrect: boolean
  }

  // User-related types
  interface User {
    id: string
    name: string
    email: string
    image?: string
    role: 'user' | 'admin'
    createdAt: string
    updatedAt: string
  }

  // API response types
  interface ApiResponse<T> {
    data?: T
    error?: {
      code: string
      message: string
      details?: unknown
    }
  }

  // Common utility types
  type Nullable<T> = T | null
  type Optional<T> = T | undefined
  type LoadingState = 'idle' | 'loading' | 'success' | 'error'
}
