'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useParams } from 'next/navigation'

export default function QuizzesAttemptRedirect() {
  const router = useRouter()
  const params = useParams()
  const quizId = params.id as string

  useEffect(() => {
    if (quizId) {
      console.log(
        `Redirecting from /quizzes/${quizId}/attempt to /quiz/${quizId}/attempt`
      )
      router.replace(`/quiz/${quizId}/attempt`)
    }
  }, [quizId, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-lg font-semibold">Redirecting...</div>
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
      </div>
    </div>
  )
}
