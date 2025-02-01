'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import clsx from 'clsx'

interface Question {
  id: string
  text: string
  options: string[]
}

interface QuizAttempt {
  id: string
  quizId: string
  status: string
  currentQuestionIndex: number
  totalQuestions: number
  score: number
}

export default function QuizAttemptPage() {
  const params = useParams()
  const router = useRouter()
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const startQuizAttempt = async () => {
      try {
        const response = await fetch('http://localhost:8083/attempts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: 'current-user-id', // TODO: Replace with actual user ID
            quizId: params.quizId,
            totalQuestions: 10, // TODO: Get this from quiz details
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to start quiz attempt')
        }

        const data = await response.json()
        setAttempt(data.data)
        await loadQuestion(data.data.id, 0)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start quiz')
      } finally {
        setLoading(false)
      }
    }

    startQuizAttempt()
  }, [params.quizId])

  const loadQuestion = async (attemptId: string, questionIndex: number) => {
    // TODO: Implement question loading from backend
    // This is a mock implementation
    setCurrentQuestion({
      id: `question-${questionIndex}`,
      text: `This is question ${questionIndex + 1}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
    })
  }

  const handleAnswerSubmit = async () => {
    if (!attempt || !currentQuestion) return

    try {
      const response = await fetch(
        `http://localhost:8083/attempts/${attempt.id}/answers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            answer: selectedAnswer,
            isCorrect: true, // TODO: Implement actual answer validation
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to submit answer')
      }

      if (attempt.currentQuestionIndex + 1 >= attempt.totalQuestions) {
        await completeAttempt()
      } else {
        const newAttempt = {
          ...attempt,
          currentQuestionIndex: attempt.currentQuestionIndex + 1,
        }
        setAttempt(newAttempt)
        await loadQuestion(attempt.id, newAttempt.currentQuestionIndex)
        setSelectedAnswer('')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    }
  }

  const completeAttempt = async () => {
    if (!attempt) return

    try {
      const response = await fetch(
        `http://localhost:8083/attempts/${attempt.id}/complete`,
        {
          method: 'POST',
        }
      )

      if (!response.ok) {
        throw new Error('Failed to complete attempt')
      }

      router.push(`/quiz-result/${attempt.id}`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to complete attempt'
      )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="m-4">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="m-4">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load quiz
              </h3>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h2 className="mb-6 text-2xl font-bold">
            Question {attempt.currentQuestionIndex + 1} of{' '}
            {attempt.totalQuestions}
          </h2>

          <p className="mb-8 text-lg">{currentQuestion.text}</p>

          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={clsx(
                  'flex cursor-pointer items-center rounded-lg border p-4 hover:bg-gray-50',
                  selectedAnswer === option
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200'
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                />
                <span className="ml-3 block text-sm font-medium">{option}</span>
              </label>
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer}
              className={clsx(
                'rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm',
                selectedAnswer
                  ? 'bg-primary hover:bg-primary/90'
                  : 'cursor-not-allowed bg-gray-300'
              )}
            >
              {attempt.currentQuestionIndex + 1 === attempt.totalQuestions
                ? 'Submit Quiz'
                : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
