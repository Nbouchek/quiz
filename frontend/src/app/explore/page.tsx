'use client'

import { useQuizzes } from '@/hooks/useQuizzes'
import { QuizCard } from '@/components/quiz/QuizCard'
import type { Quiz } from '@/types'
import { ArrowPathIcon } from '@heroicons/react/24/outline'

export default function ExplorePage() {
  const { quizzes, isLoading, error, refetch } = useQuizzes()

  console.log('ExplorePage render:', { quizzes, isLoading, error })

  const handleRefresh = async () => {
    console.log('Manually refreshing quizzes...')
    await refetch()
  }

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="text-lg">Loading quizzes...</div>
      </div>
    )
  }

  if (error) {
    console.error('Error in ExplorePage:', error)
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading quizzes
            </h3>
            <div className="mt-2 text-sm text-red-700">
              Please try again later.
            </div>
            <button
              onClick={handleRefresh}
              className="mt-2 inline-flex items-center rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200"
            >
              <ArrowPathIcon className="mr-2 h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  console.log('Rendering quizzes:', quizzes)
  return (
    <div className="container mx-auto px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Explore Quizzes</h1>
          <p className="mt-2 text-gray-600">
            Discover and take quizzes created by the community
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          <ArrowPathIcon className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quizzes &&
          quizzes.map((quiz: Quiz) => {
            console.log('Rendering quiz:', quiz)
            return <QuizCard key={quiz.id} quiz={quiz} />
          })}
        {(!quizzes || quizzes.length === 0) && (
          <div className="col-span-full text-center text-gray-500">
            No quizzes available yet. Be the first to create one!
          </div>
        )}
      </div>
    </div>
  )
}
