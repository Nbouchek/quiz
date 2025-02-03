'use client'

import { useQuizzes } from '@/hooks/useQuizzes'
import { QuizCard } from '@/components/quiz/QuizCard'
import type { Quiz } from '@/types'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

export default function ExplorePage() {
  const { quizzes, isLoading, error, refetch } = useQuizzes()

  const handleRefresh = async () => {
    console.log('Manually refreshing quizzes...')
    await refetch()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <ArrowPathIcon className="h-12 w-12 animate-spin text-gray-400" />
          <div className="mt-4 text-lg text-gray-600">Loading quizzes...</div>
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Error in ExplorePage:', error)
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg bg-red-50 p-8">
          <div className="flex flex-col items-center">
            <svg
              className="h-12 w-12 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-red-800">
              Error loading quizzes
            </h3>
            <div className="mt-2 text-center text-sm text-red-700">
              {error instanceof Error
                ? error.message
                : 'Please try again later.'}
            </div>
            <button
              onClick={handleRefresh}
              className="mt-6 inline-flex items-center rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-800 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Explore Quizzes
            </h1>
            <p className="mt-2 text-gray-600">
              Discover and take quizzes created by the community
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="mt-4 inline-flex items-center rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 sm:mt-0"
          >
            <ArrowPathIcon
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>

        {Array.isArray(quizzes) && quizzes.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {quizzes.map((quiz: Quiz) => (
              <QuizCard key={quiz.id} quiz={quiz} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12">
            <svg
              className="h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <p className="mt-4 text-center text-gray-500">
              No quizzes available yet. Be the first to create one!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
