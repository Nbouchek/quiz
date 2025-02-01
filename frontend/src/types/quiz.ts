export interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer?: string
  explanation?: string
}

export interface QuizAttempt {
  id: string
  userId: string
  quizId: string
  status: 'in_progress' | 'completed' | 'abandoned'
  score?: number
  startedAt: string
  completedAt?: string
  answers: Answer[]
  totalQuestions: number
  correctAnswers: number
}

export interface Answer {
  id: string
  attemptId: string
  questionId: string
  answer: string
  isCorrect?: boolean
  createdAt: string
}

export interface Quiz {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeLimit?: number
  questions?: Question[]
  createdAt: string
  updatedAt: string
}
