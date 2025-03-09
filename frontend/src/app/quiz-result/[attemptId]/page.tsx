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

  useEffect(() => {
    const loadQuizResult = async () => {
      try {
        const response = await fetch(
          `${STUDY_API_URL}/attempts/${params.attemptId}`
        )
        if (!response.ok) {
          throw new Error('Failed to load quiz result')
        }
        const data = await response.json()
        setAttempt(data.data)

        // Load answers
        const answersResponse = await fetch(
          `${STUDY_API_URL}/attempts/${params.attemptId}/answers`
        )
        if (!answersResponse.ok) {
          throw new Error('Failed to load answers')
        }
        const answersData = await answersResponse.json()
        setAnswers(answersData.data)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load quiz result'
        )
      } finally {
        setLoading(false)
      }
    }

    loadQuizResult()
  }, [params.attemptId])

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
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-4">
      <div className="mb-8 overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h1 className="mb-4 text-3xl font-bold">Quiz Results</h1>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Score</div>
              <div className="mt-1 text-2xl font-semibold">
                {Math.round(attempt.score)}%
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Correct Answers</div>
              <div className="mt-1 text-2xl font-semibold">
                {attempt.correctAnswers} / {attempt.totalQuestions}
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
                )}{' '}
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
          onClick={() => router.push('/quizzes')}
          className="bg-primary hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm"
        >
          Try Another Quiz
        </button>
      </div>
    </div>
  )
}
