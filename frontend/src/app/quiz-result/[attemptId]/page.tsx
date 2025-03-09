'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import clsx from 'clsx'
import { STUDY_API_URL } from '@/config/constants'

interface QuizAttempt {
  id: string
  quizId: string
  status: 'completed' | 'abandoned'
  score: number
  totalQuestions: number
  correctAnswers: number
  startedAt: string
  completedAt: string
}

interface Answer {
  id: string
  questionId: string
  answer: string
  isCorrect: boolean
  question: {
    text: string
    options: string[]
    correctAnswer: string
    explanation?: string
  }
}

export default function QuizResultPage() {
  const params = useParams()
  const router = useRouter()
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [score, setScore] = useState<number>(0)
  const [rawData, setRawData] = useState<any>(null) // Store raw response for debugging

  // DEBUG MODE
  const DEBUG = true

  // Helper logging function
  const debugLog = (...args: any[]) => {
    if (DEBUG) {
      console.log('QUIZ RESULT DEBUG:', ...args)
    }
  }

  useEffect(() => {
    const loadQuizResult = async () => {
      try {
        // Log the attempt ID to verify it's correct
        debugLog('Loading quiz result for attempt ID:', params.attemptId)

        const response = await fetch(
          `${STUDY_API_URL}/attempts/${params.attemptId}`
        )

        if (!response.ok) {
          throw new Error(`Failed to load quiz result: ${response.status}`)
        }

        // Parse the response data
        const responseData = await response.json()
        setRawData(responseData) // Store raw data for debugging

        debugLog('Full API Response:', JSON.stringify(responseData, null, 2))

        // Check if the expected data exists
        if (!responseData || !responseData.data) {
          throw new Error('Invalid response format: missing data property')
        }

        const attemptData = responseData.data

        // Store the attempt data
        setAttempt(attemptData)

        // Log detailed data about the attempt for debugging
        debugLog('Attempt data properties:', Object.keys(attemptData))
        debugLog(
          'correctAnswers:',
          attemptData.correctAnswers,
          'type:',
          typeof attemptData.correctAnswers
        )
        debugLog(
          'totalQuestions:',
          attemptData.totalQuestions,
          'type:',
          typeof attemptData.totalQuestions
        )
        debugLog(
          'score from API:',
          attemptData.score,
          'type:',
          typeof attemptData.score
        )

        // Manual parsing approach for the score calculation
        let correctCount = 0
        let totalCount = 0

        // Check if correctAnswers is missing (this appears to be the case from the debug output)
        if (
          attemptData.correctAnswers === undefined ||
          attemptData.correctAnswers === null
        ) {
          debugLog(
            'correctAnswers is missing, will use score from API directly'
          )
          // If API provides a score, use that directly
          if (
            typeof attemptData.score === 'number' &&
            !isNaN(attemptData.score)
          ) {
            setScore(attemptData.score)
            debugLog('Using score directly from API:', attemptData.score)

            // Since we don't have correctAnswers but we need to display it, calculate it from score
            if (
              typeof attemptData.totalQuestions === 'number' &&
              attemptData.totalQuestions > 0
            ) {
              // If we have a percentage score, convert it back to number of correct answers
              const calculatedCorrectAnswers = Math.round(
                (attemptData.score / 100) * attemptData.totalQuestions
              )
              // Update the attempt object with the calculated correctAnswers
              attemptData.correctAnswers = calculatedCorrectAnswers
              debugLog(
                'Calculated correctAnswers from score:',
                calculatedCorrectAnswers
              )
            }

            // Store the updated attempt data
            setAttempt(attemptData)
            return
          }
        }

        // Try to parse the values safely (this is the original logic for when correctAnswers exists)
        try {
          correctCount = parseInt(attemptData.correctAnswers, 10)
          totalCount = parseInt(attemptData.totalQuestions, 10)

          // If parsing resulted in NaN, use the original values
          if (isNaN(correctCount)) {
            debugLog(
              'Failed to parse correctAnswers as int, using original:',
              attemptData.correctAnswers
            )
            correctCount = attemptData.correctAnswers
          }

          if (isNaN(totalCount)) {
            debugLog(
              'Failed to parse totalQuestions as int, using original:',
              attemptData.totalQuestions
            )
            totalCount = attemptData.totalQuestions
          }
        } catch (parseError) {
          debugLog('Error parsing score values:', parseError)
          // Fall back to original values if parsing fails
          correctCount = attemptData.correctAnswers
          totalCount = attemptData.totalQuestions
        }

        // Very explicit score calculation with checks
        let calculatedScore = 0

        if (
          typeof correctCount === 'number' &&
          typeof totalCount === 'number' &&
          !isNaN(correctCount) &&
          !isNaN(totalCount) &&
          totalCount > 0
        ) {
          calculatedScore = Math.round((correctCount / totalCount) * 100)
          debugLog(
            `Score calculation: (${correctCount} / ${totalCount}) * 100 = ${calculatedScore}%`
          )
        } else {
          debugLog('Invalid values for score calculation:', {
            correctCount,
            totalCount,
          })
        }

        // Force a valid score (0-100 range)
        calculatedScore = Math.max(0, Math.min(100, calculatedScore))
        setScore(calculatedScore)
        debugLog('Final score set to:', calculatedScore)

        // Load answers
        const answersResponse = await fetch(
          `${STUDY_API_URL}/attempts/${params.attemptId}/answers`
        )
        if (!answersResponse.ok) {
          throw new Error('Failed to load answers')
        }
        const answersData = await answersResponse.json()
        debugLog('Answers data:', answersData.data)
        setAnswers(answersData.data || [])
      } catch (err) {
        console.error('Error loading quiz result:', err)
        setError(
          err instanceof Error ? err.message : 'Failed to load quiz result'
        )
      } finally {
        setLoading(false)
      }
    }

    if (params.attemptId) {
      loadQuizResult()
    }
  }, [params.attemptId])

  // Additional effect to log after state updates
  useEffect(() => {
    if (attempt && !loading) {
      debugLog('State after data load - attempt:', attempt, 'score:', score)
    }
  }, [attempt, score, loading])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"></div>
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

  if (!attempt) {
    return (
      <div className="m-4">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load quiz result
              </h3>
              {rawData && (
                <details className="mt-2 text-xs">
                  <summary>Debug Information</summary>
                  <pre className="mt-2 max-h-96 overflow-auto rounded bg-gray-100 p-2">
                    {JSON.stringify(rawData, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Display debug info in development mode
  const debugInfo = DEBUG ? (
    <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-xs">
      <details>
        <summary className="cursor-pointer font-bold">
          Debug Information
        </summary>
        <div className="mt-2 space-y-2">
          <div>
            <strong>Attempt ID:</strong> {params.attemptId as string}
          </div>
          <div>
            <strong>Calculated Score:</strong> {score}%
          </div>
          <div>
            <strong>Raw Data:</strong>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-100 p-2">
              {JSON.stringify(
                {
                  correctAnswers: attempt.correctAnswers,
                  totalQuestions: attempt.totalQuestions,
                  score: attempt.score,
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </details>
    </div>
  ) : null

  return (
    <div className="mx-auto max-w-4xl p-4">
      {debugInfo}

      <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h1 className="mb-4 text-3xl font-bold">Quiz Results</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Score</div>
              <div className="mt-1 text-2xl font-semibold">{score}%</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Correct Answers</div>
              <div className="mt-1 text-2xl font-semibold">
                {attempt.correctAnswers !== undefined
                  ? attempt.correctAnswers
                  : '0'}{' '}
                / {attempt.totalQuestions || 0}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Time Taken</div>
              <div className="mt-1 text-2xl font-semibold">
                {Math.round(
                  (new Date(attempt.completedAt).getTime() -
                    new Date(attempt.startedAt).getTime()) /
                    1000 /
                    60
                ) || 0}{' '}
                min
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {answers.map((answer, index) => (
          <div
            key={answer.id}
            className="overflow-hidden rounded-lg bg-white shadow"
          >
            <div className="border-b bg-gray-50 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900">
                Question {index + 1}
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="mb-4 text-lg text-gray-900">
                {answer.question.text}
              </p>
              <div className="space-y-3">
                {answer.question.options.map((option) => (
                  <div
                    key={option}
                    className={clsx(
                      'flex items-center justify-between rounded-lg border p-4',
                      option === answer.question.correctAnswer
                        ? 'border-green-500 bg-green-50'
                        : option === answer.answer && !answer.isCorrect
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200'
                    )}
                  >
                    <span className="text-gray-900">{option}</span>
                    {option === answer.question.correctAnswer && (
                      <CheckIcon className="h-5 w-5 text-green-500" />
                    )}
                    {option === answer.answer && !answer.isCorrect && (
                      <XMarkIcon className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                ))}
              </div>
              {answer.question.explanation && (
                <div className="mt-4 rounded-lg bg-primary-50 p-4 text-sm text-primary-700">
                  <strong>Explanation:</strong> {answer.question.explanation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-between">
        <button
          onClick={() => router.push(`/quizzes/${attempt.quizId}`)}
          className="rounded-md bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Back to Quiz
        </button>
        <button
          onClick={() => router.push('/explore')}
          className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Try Another Quiz
        </button>
      </div>
    </div>
  )
}
