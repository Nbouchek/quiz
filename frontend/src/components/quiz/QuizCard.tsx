import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { Quiz } from '@/types'

interface QuizCardProps {
  quiz: Quiz
  className?: string
}

export function QuizCard({ quiz, className }: QuizCardProps) {
  return (
    <Link
      href={`/quizzes/${quiz.id}`}
      className={cn(
        'block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <h5 className="mb-2 text-xl font-bold tracking-tight text-gray-900">
        {quiz.title}
      </h5>
      <p className="mb-3 text-sm font-normal text-gray-700">
        {quiz.description}
      </p>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{quiz.questions.length} questions</span>
        <span>Created {formatDistanceToNow(new Date(quiz.createdAt))} ago</span>
      </div>
    </Link>
  )
}
