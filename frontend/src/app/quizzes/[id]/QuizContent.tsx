'use client'

import { useQuiz } from '@/hooks/useQuiz'
import {
  XMarkIcon,
  ClockIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'
import { AxiosError } from 'axios'
import { useRouter } from 'next/navigation'

interface QuizContentProps {
  quizId: string
}

export default function QuizContent({ quizId }: QuizContentProps) {
  const router = useRouter()
  const { quiz, isLoading, error } = useQuiz(quizId, {
    enabled: !!quizId,
  })

  if (!quizId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-gray-600">Invalid quiz ID</div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-gray-600">Loading quiz...</div>
      </div>
    )
  }

  if (error) {
    const axiosError = error as AxiosError<{ error: string }>
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading quiz
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {axiosError.response?.data?.error ||
                  axiosError.message ||
                  'Please try again later.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg text-gray-600">Quiz not found</div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="px-8 py-12">
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            {quiz.title}
          </h1>
          <p className="mb-8 text-lg text-gray-600">{quiz.description}</p>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-center space-x-2 text-gray-500">
              <QuestionMarkCircleIcon className="h-5 w-5" />
              <span>{quiz.questions?.length || 0} Questions</span>
            </div>
            <div className="flex items-center space-x-2 text-gray-500">
              <ClockIcon className="h-5 w-5" />
              <span>
                Estimated time: {(quiz.questions?.length || 0) * 2} minutes
              </span>
            </div>
          </div>

          <button
            onClick={() => router.push(`/quiz/${quizId}/attempt`)}
            className="w-full rounded-md bg-primary px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 sm:w-auto"
          >
            Start Quiz
          </button>
        </div>
      </div>
    </div>
  )
}
