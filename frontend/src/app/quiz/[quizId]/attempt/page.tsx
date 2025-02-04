'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { XMarkIcon } from '@heroicons/react/24/outline'
import { QUIZ_API_URL } from '@/config/constants'
import { useQuizAttempt } from '@/hooks/useQuizAttempt'
import { Question, QuizAttempt } from '@/types/quiz'

export default function QuizAttemptPage() {
  const params = useParams()
  const router = useRouter()
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const {
    startAttempt,
    getQuestions,
    submitAnswer,
    completeAttempt: finishAttempt,
  } = useQuizAttempt()

  useEffect(() => {
    const initQuizAttempt = async () => {
      try {
        const quizId = Array.isArray(params.quizId)
          ? params.quizId[0]
          : params.quizId

        console.log('Quiz ID:', quizId)

        // Fetch the quiz details to get the number of questions
        const quizUrl = `${QUIZ_API_URL}/${quizId}`
        console.log('Fetching quiz details from:', quizUrl)

        const quizResponse = await fetch(quizUrl, {
          headers: {
            Accept: 'application/json',
            Origin: window.location.origin,
          },
          credentials: 'include',
        })

        console.log('Quiz response status:', quizResponse.status)
        if (!quizResponse.ok) {
          const errorData = await quizResponse.json().catch(() => ({}))
          console.error('Quiz fetch error:', errorData)
          throw new Error(errorData.error || 'Failed to fetch quiz details')
        }

        const quizData = await quizResponse.json()
        console.log('Quiz data:', quizData)

        if (!quizData.data || !quizData.data.questions) {
          console.error('Invalid quiz data format:', quizData)
          throw new Error('Invalid quiz data format')
        }

        const totalQuestions = quizData.data.questions.length
        console.log('Total questions:', totalQuestions)

        // Start the quiz attempt using the hook
        const newAttempt = await startAttempt(quizId, totalQuestions)
        console.log('Quiz attempt started:', newAttempt)

        // Ensure the attempt has all required fields
        if (!newAttempt) {
          console.error('Invalid attempt data:', newAttempt)
          throw new Error('Invalid attempt data: missing required fields')
        }

        setAttempt(newAttempt)
        setCurrentQuestionIndex(0)
        await loadQuestion(newAttempt.id, 0)
      } catch (err) {
        console.error('Start quiz error:', err)
        setError(err instanceof Error ? err.message : 'Failed to start quiz')
      } finally {
        setLoading(false)
      }
    }

    initQuizAttempt()
  }, [params.quizId, startAttempt])

  const loadQuestion = async (attemptId: string, questionIndex: number) => {
    try {
      console.log('Loading questions for attempt:', attemptId)
      const questions = await getQuestions(attemptId)
      console.log('Questions loaded:', questions)

      if (!questions[questionIndex]) {
        throw new Error('Question not found')
      }

      setCurrentQuestion(questions[questionIndex])
    } catch (err) {
      console.error('Load question error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
    }
  }

  const handleAnswerSubmit = async () => {
    if (!attempt || !currentQuestion || !selectedAnswer) {
      setError('Please select an answer before submitting')
      return
    }

    try {
      console.log('Submitting answer:', {
        attemptId: attempt.id,
        questionId: currentQuestion.id,
        answer: selectedAnswer,
      })

      await submitAnswer(attempt.id, currentQuestion.id, selectedAnswer)

      // Check if this was the last question
      const isLastQuestion = currentQuestionIndex + 1 >= attempt.totalQuestions

      if (isLastQuestion) {
        await completeAttempt()
      } else {
        // Update attempt with next question index
        const nextQuestionIndex = currentQuestionIndex + 1
        setCurrentQuestionIndex(nextQuestionIndex)

        // Load the next question
        await loadQuestion(attempt.id, nextQuestionIndex)
        setSelectedAnswer('')
      }
    } catch (err) {
      console.error('Submit answer error:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    }
  }

  const completeAttempt = async () => {
    if (!attempt) return

    try {
      console.log('Completing attempt:', attempt.id)
      const completedAttempt = await finishAttempt(attempt.id)
      console.log('Attempt completed:', completedAttempt)
      router.push(`/quiz-result/${attempt.id}`)
    } catch (err) {
      console.error('Complete attempt error:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to complete attempt'
      )
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto h-12 w-12 animate-spin rounded-full border-4 border-t-transparent"></div>
          <h2 className="mt-4 text-lg font-medium text-gray-900">
            Loading quiz...
          </h2>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto w-full max-w-md p-6">
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <XMarkIcon
                  className="h-5 w-5 text-red-400"
                  aria-hidden="true"
                />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/explore')}
                    className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-sm font-medium text-red-800 hover:bg-red-100"
                  >
                    Back to Explore
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mx-auto w-full max-w-md p-6">
          <div className="rounded-md bg-yellow-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  No quiz attempt in progress
                </h3>
                <div className="mt-4">
                  <button
                    onClick={() => router.push('/explore')}
                    className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-1 text-sm font-medium text-yellow-800 hover:bg-yellow-100"
                  >
                    Back to Explore
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Question {currentQuestionIndex + 1} of {attempt.totalQuestions}
          </span>
          <span>
            {Math.round((currentQuestionIndex / attempt.totalQuestions) * 100)}%
            Complete
          </span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${(currentQuestionIndex / attempt.totalQuestions) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900">
          {currentQuestion.text}
        </h2>

        {/* Options */}
        <div className="mt-6 space-y-4">
          {currentQuestion.options.map((option) => (
            <div key={option} className="flex items-center">
              <input
                id={option}
                name="answer"
                type="radio"
                value={option}
                checked={selectedAnswer === option}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
              />
              <label
                htmlFor={option}
                className="ml-3 block text-sm font-medium text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>

        {/* Submit button */}
        <div className="mt-8">
          <button
            onClick={handleAnswerSubmit}
            disabled={!selectedAnswer}
            className={clsx(
              'w-full rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm',
              selectedAnswer
                ? 'bg-primary hover:bg-primary/90'
                : 'cursor-not-allowed bg-gray-300'
            )}
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  )
}
