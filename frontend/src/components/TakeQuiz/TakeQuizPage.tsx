import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { ExclamationCircleIcon, ArrowLeftIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import QuizQuestion from './QuizQuestion'
import { useQuizAttempt } from '../../hooks/useQuizAttempt'
import { Question, QuizAttempt } from '../../types/quiz'
import { cn } from '../../utils/cn'

const TakeQuizPage: React.FC = () => {
  const router = useRouter()
  const { quizId } = router.query
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { startAttempt, getQuestions, submitAnswer, completeAttempt } = useQuizAttempt()

  useEffect(() => {
    const initializeQuiz = async () => {
      if (!quizId || typeof quizId !== 'string') return
      try {
        const newAttempt = await startAttempt(quizId, 10)
        setAttempt(newAttempt)
        const quizQuestions = await getQuestions(newAttempt.id)
        setQuestions(quizQuestions)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to start quiz'
        setError(message)
        console.error('Failed to start quiz:', error)
      }
    }

    initializeQuiz()
  }, [quizId, startAttempt, getQuestions])

  const handleAnswerSubmit = async (questionId: string, answer: string) => {
    if (!attempt) return

    try {
      setIsSubmitting(true)
      await submitAnswer(attempt.id, questionId, answer)
      setAnswers({ ...answers, [questionId]: answer })

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit answer'
      setError(message)
      console.error('Failed to submit answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuizComplete = async () => {
    if (!attempt || !quizId) return

    try {
      setIsSubmitting(true)
      const completedAttempt = await completeAttempt(attempt.id)
      router.push(`/quiz/${quizId}/results/${completedAttempt.id}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to complete quiz'
      setError(message)
      console.error('Failed to complete quiz:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-lg bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    className="rounded-md bg-red-50 px-2 py-1.5 text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!attempt || questions.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="p-6">
          <QuizQuestion
            question={currentQuestion}
            onSubmit={handleAnswerSubmit}
            isSubmitting={isSubmitting}
            currentQuestionNumber={currentQuestionIndex + 1}
            totalQuestions={questions.length}
          />

          <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className={cn(
                'inline-flex items-center rounded-md px-4 py-2 text-sm font-medium',
                currentQuestionIndex === 0
                  ? 'cursor-not-allowed text-gray-400'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <ArrowLeftIcon className="mr-2 h-5 w-5" />
              Previous
            </button>

            {isLastQuestion ? (
              <button
                type="button"
                onClick={handleQuizComplete}
                disabled={isSubmitting}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Complete Quiz
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                disabled={!answers[currentQuestion.id] || isSubmitting}
                className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next Question
                <ArrowRightIcon className="ml-2 h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TakeQuizPage
