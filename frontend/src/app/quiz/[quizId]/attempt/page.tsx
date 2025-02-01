'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { STUDY_API_URL } from '@/config/constants'

interface Question {
  id: string
  text: string
  options: string[]
  type: 'multiple_choice' | 'true_false' | 'open_ended'
}

interface QuizAttempt {
  id: string
  quizId: string
  status: 'in_progress' | 'completed' | 'abandoned'
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
        const quizId = Array.isArray(params.quizId)
          ? params.quizId[0]
          : params.quizId

        console.log('Raw quiz ID:', quizId)

        // Try to format the quiz ID as a UUID if it's not already
        let formattedQuizId = quizId
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            quizId
          )
        ) {
          // If it's a simple string of correct length, try to format it
          const cleanId = quizId.replace(/-/g, '')
          if (cleanId.length === 32) {
            formattedQuizId = `${cleanId.slice(0, 8)}-${cleanId.slice(8, 12)}-${cleanId.slice(12, 16)}-${cleanId.slice(16, 20)}-${cleanId.slice(20)}`
          }
        }

        console.log('Formatted quiz ID:', formattedQuizId)

        // Validate the formatted quiz ID
        if (
          !formattedQuizId ||
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            formattedQuizId
          )
        ) {
          console.error('Invalid quiz ID format:', formattedQuizId)
          throw new Error('Invalid quiz ID format')
        }

        const requestBody = {
          userId: '00000000-0000-0000-0000-000000000001', // Test UUID
          quizId: formattedQuizId,
          totalQuestions: 10,
        }
        console.log('Request body:', requestBody)
        console.log('Request URL:', `${STUDY_API_URL}/attempts`)

        const response = await fetch(`${STUDY_API_URL}/attempts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          credentials: 'include',
        })

        console.log('Response status:', response.status)
        console.log(
          'Response headers:',
          Object.fromEntries(response.headers.entries())
        )

        if (!response.ok) {
          const errorData = await response.json()
          console.error('Start quiz error:', errorData)
          throw new Error(errorData.error || 'Failed to start quiz attempt')
        }

        const data = await response.json()
        console.log('Start quiz response:', data)
        if (!data.data) {
          throw new Error('Invalid response format')
        }

        setAttempt(data.data)
        await loadQuestion(data.data.id, 0)
      } catch (err) {
        console.error('Start quiz error:', err)
        setError(err instanceof Error ? err.message : 'Failed to start quiz')
      } finally {
        setLoading(false)
      }
    }

    startQuizAttempt()
  }, [params.quizId])

  const loadQuestion = async (attemptId: string, questionIndex: number) => {
    try {
      const response = await fetch(
        `${STUDY_API_URL}/attempts/${attemptId}/questions/${questionIndex}`
      )
      if (!response.ok) {
        throw new Error('Failed to load question')
      }
      const data = await response.json()
      setCurrentQuestion(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load question')
    }
  }

  const handleAnswerSubmit = async () => {
    if (!attempt || !currentQuestion) return

    try {
      const response = await fetch(
        `${STUDY_API_URL}/attempts/${attempt.id}/answers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionId: currentQuestion.id,
            answer: selectedAnswer,
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
        `${STUDY_API_URL}/attempts/${attempt.id}/complete`,
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
              <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
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
    <div className="mx-auto max-w-4xl p-4">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              Question {attempt.currentQuestionIndex + 1} of{' '}
              {attempt.totalQuestions}
            </h2>
            <div className="text-sm text-gray-500">
              Progress:{' '}
              {Math.round(
                (attempt.currentQuestionIndex / attempt.totalQuestions) * 100
              )}
              %
            </div>
          </div>

          <div className="mb-8">
            <div className="h-2 w-full rounded-full bg-gray-200">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{
                  width: `${(attempt.currentQuestionIndex / attempt.totalQuestions) * 100}%`,
                }}
              ></div>
            </div>
          </div>

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
