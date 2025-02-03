import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Quiz } from '@/types'

interface QuizCardProps {
  quiz: Quiz
  className?: string
}

export function QuizCard({ quiz, className }: QuizCardProps) {
  // Format the date safely
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString))
    } catch (error) {
      console.error('Error formatting date:', error)
      return 'recently'
    }
  }

  // Ensure quiz has required fields
  if (!quiz || !quiz.id) {
    return null
  }

  return (
    <Link
      href={`/quizzes/${quiz.id}`}
      className={cn(
        'block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md',
        className
      )}
    >
      <h5 className="mb-2 line-clamp-1 text-xl font-bold tracking-tight text-gray-900">
        {quiz.title || 'Untitled Quiz'}
      </h5>
      <p className="mb-3 line-clamp-2 text-sm font-normal text-gray-700">
        {quiz.description || 'No description available'}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center">
          <svg
            className="mr-1 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {quiz.questions?.length || 0} questions
        </span>
        <span className="flex items-center">
          <svg
            className="mr-1 h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Created {quiz.createdAt ? formatDate(quiz.createdAt) : 'recently'} ago
        </span>
      </div>
    </Link>
  )
}
