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

        // Simplified score calculation logic
        let calculatedScore = 0

        // First, directly use score from API if it's available and valid
        if (
          typeof attemptData.score === 'number' &&
          !isNaN(attemptData.score)
        ) {
          calculatedScore = Math.round(attemptData.score)
          debugLog('Using rounded score from API:', calculatedScore)
        }
        // If score is not available, calculate it from correctAnswers and totalQuestions
        else if (
          typeof attemptData.correctAnswers === 'number' &&
          typeof attemptData.totalQuestions === 'number' &&
          attemptData.totalQuestions > 0
        ) {
          calculatedScore = Math.round(
            (attemptData.correctAnswers / attemptData.totalQuestions) * 100
          )
          debugLog(
            `Calculated score: (${attemptData.correctAnswers} / ${attemptData.totalQuestions}) * 100 = ${calculatedScore}%`
          )
        } else {
          debugLog(
            'Could not determine score from attempt data, defaulting to 0'
          )
        }

        // Ensure score is in valid range
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

        // Set answers state
        const answersArray = answersData.data || []
        setAnswers(answersArray)

        // If the API returns a score of 0 but there are correct answers in the array,
        // recalculate the score from the answers data
        if (calculatedScore === 0 && answersArray.length > 0) {
          const correctCount = answersArray.filter(
            (a: Answer) => a.isCorrect
          ).length
          if (correctCount > 0 && attemptData.totalQuestions > 0) {
            const recalculatedScore = Math.round(
              (correctCount / attemptData.totalQuestions) * 100
            )
            debugLog(
              `API returned score of 0 but found ${correctCount} correct answers. Recalculating score: ${recalculatedScore}%`
            )
            setScore(recalculatedScore)
          }
        }
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
            <strong>API Score:</strong>{' '}
            {attempt.score !== undefined ? `${attempt.score}` : 'undefined'}
          </div>
          <div>
            <strong>Correct Answers:</strong>{' '}
            {attempt.correctAnswers !== undefined
              ? `${attempt.correctAnswers}`
              : 'undefined'}{' '}
            / {attempt.totalQuestions}
          </div>
          <div>
            <strong>Answer Count:</strong> {answers.length}
          </div>
          <div>
            <strong>Correct Answer Count from Answers Array:</strong>{' '}
            {answers.filter((a) => a.isCorrect).length}
          </div>
          <div>
            <strong>Raw Data:</strong>
            <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-100 p-2">
              {JSON.stringify(
                {
                  correctAnswers: attempt.correctAnswers,
                  totalQuestions: attempt.totalQuestions,
                  score: attempt.score,
                  answers: answers.map((a) => ({
                    id: a.id,
                    isCorrect: a.isCorrect,
                    answer: a.answer,
                  })),
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

          {/* Show a message for quizzes with no submitted answers */}
          {answers.length === 0 && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800">
              <h3 className="font-medium">No answers submitted</h3>
              <p className="mt-1 text-sm">
                This quiz was completed without submitting any answers. The
                score is 0%.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Score</div>
              <div className="mt-1 text-2xl font-semibold">
                {score === 0 &&
                answers.filter((a: Answer) => a.isCorrect).length > 0
                  ? Math.round(
                      (answers.filter((a: Answer) => a.isCorrect).length /
                        attempt.totalQuestions) *
                        100
                    )
                  : score}
                %
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Correct Answers</div>
              <div className="mt-1 text-2xl font-semibold">
                {answers.length === 0
                  ? '0'
                  : typeof attempt.correctAnswers === 'number' &&
                      attempt.correctAnswers > 0
                    ? attempt.correctAnswers
                    : answers.filter((a: Answer) => a.isCorrect).length}{' '}
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

      {/* Only show questions if there are answers */}
      {answers.length > 0 ? (
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
      ) : (
        <div className="rounded-lg bg-white p-8 text-center shadow">
          <h3 className="text-xl font-medium text-gray-900">
            No answers to display
          </h3>
          <p className="mt-2 text-gray-600">
            This quiz was completed without submitting any answers.
          </p>
        </div>
      )}

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
