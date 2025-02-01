'use client'

import { useQuizzes } from '@/hooks/useQuizzes'
import { QuizCard } from '@/components/quiz/QuizCard'

export default function HistoryPage() {
  const { quizzes, isLoading, error } = useQuizzes()

  if (isLoading) {
    return (
      <div className="text-center">
        <div className="text-lg">Loading your quiz history...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Error loading quiz history
            </h3>
            <div className="mt-2 text-sm text-red-700">
              Please try again later.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const userQuizzes = quizzes?.filter(
    (quiz) => quiz.creatorId === 'current-user'
  ) // TODO: Replace with actual user ID

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Your Quizzes</h1>
        <p className="mt-2 text-gray-600">
          View and manage quizzes you've created
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {userQuizzes?.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} />)}
        {userQuizzes?.length === 0 && (
          <div className="col-span-full text-center text-gray-500">
            You haven't created any quizzes yet.
          </div>
        )}
      </div>
    </div>
  )
}
