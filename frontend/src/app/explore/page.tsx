'use client'

import { useQuizzes } from '@/hooks/useQuizzes'
import { QuizCard } from '@/components/quiz/QuizCard'
import type { Quiz } from '@/types'

export default function ExplorePage() {
  const { quizzes, isLoading, error } = useQuizzes()

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="text-lg">Loading quizzes...</div>
      </div>
    )
  }

  if (error) {
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Explore Quizzes</h1>
        <p className="mt-2 text-gray-600">
          Discover and take quizzes created by the community
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {quizzes &&
          quizzes.map((quiz: Quiz) => <QuizCard key={quiz.id} quiz={quiz} />)}
        {(!quizzes || quizzes.length === 0) && (
          <div className="col-span-full text-center text-gray-500">
            No quizzes available yet. Be the first to create one!
          </div>
        )}
      </div>
    </div>
  )
}
