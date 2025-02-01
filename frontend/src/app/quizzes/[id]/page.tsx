import { Suspense } from 'react'
import { Metadata } from 'next'
import QuizContent from './QuizContent'
import { notFound } from 'next/navigation'

interface PageProps {
  params: { id: string }
}

function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-lg text-gray-600">Loading quiz...</div>
    </div>
  )
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  return {
    title: `Quiz #${params.id} | QuizApp`,
    description: `View details and questions for quiz #${params.id}`,
  }
}

export default function QuizPage({ params }: PageProps) {
  if (!params.id) {
    notFound()
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<Loading />}>
        <QuizContent quizId={params.id} />
      </Suspense>
    </div>
  )
}
