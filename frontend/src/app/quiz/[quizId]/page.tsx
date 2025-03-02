'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import clsx from 'clsx'
import { STUDY_API_URL, QUIZ_API_URL } from '@/config/constants'

interface Question {
  id: string
  text: string
  options: string[]
}

interface QuizAttempt {
  id: string
  quizId: string
  status: string
  currentQuestionIndex: number
  totalQuestions: number
  score: number
}

export default function QuizAttemptPage() {
  const params = useParams()
  const router = useRouter()
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const startQuizAttempt = async () => {
      console.log('Starting quiz attempt with params:', params)
      const quizId = Array.isArray(params.quizId)
        ? params.quizId[0]
        : params.quizId

      console.log('Quiz ID from URL param:', quizId)

      try {
        // First, fetch quiz details to get the number of questions
        console.log('Fetching quiz details from:', `${QUIZ_API_URL}/${quizId}`)

        const quizResponse = await fetch(`${QUIZ_API_URL}/${quizId}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!quizResponse.ok) {
          const quizErrorData = await quizResponse.json().catch(() => ({}))
          console.error('Error fetching quiz details:', quizErrorData)
          throw new Error(
            'Failed to fetch quiz details: ' +
              (quizErrorData.error || quizResponse.statusText)
          )
        }

        const quizData = await quizResponse.json()
        console.log('Quiz data received:', quizData)

        if (
          !quizData.success ||
          !quizData.data ||
          !Array.isArray(quizData.data.questions)
        ) {
          console.error('Invalid quiz data format:', quizData)
          throw new Error('Invalid quiz data format')
        }

        const totalQuestions = quizData.data.questions.length
        console.log('Total questions in quiz:', totalQuestions)

        if (totalQuestions === 0) {
          throw new Error('This quiz has no questions')
        }

        // Create the attempt through the API gateway
        const apiUrl = `${STUDY_API_URL}/attempts`
        console.log('Creating attempt at:', apiUrl)

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: '00000000-0000-0000-0000-000000000001', // TODO: Replace with actual user ID
            quizId: quizId,
            totalQuestions: totalQuestions,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          console.error('Error creating attempt:', errorData)
          throw new Error(
            'Failed to start quiz attempt: ' +
              (errorData.error || response.statusText)
          )
        }

        const attemptData = await response.json()
        console.log('Attempt created successfully:', attemptData)

        if (!attemptData.success || !attemptData.data) {
          console.error('Invalid attempt response format:', attemptData)
          throw new Error('Invalid attempt response format')
        }

        setAttempt(attemptData.data)
        await loadQuestion(attemptData.data.id, 0)
      } catch (err) {
        console.error('Error starting quiz:', err)
        setError(err instanceof Error ? err.message : 'Failed to start quiz')
      } finally {
        setLoading(false)
      }
    }

    startQuizAttempt()
  }, [params])

  const loadQuestion = async (attemptId: string, questionIndex: number) => {
    try {
      console.log('Loading questions for attempt:', attemptId)
      const questionsUrl = `${STUDY_API_URL}/attempts/${attemptId}/questions`
      console.log('Fetching questions from:', questionsUrl)

      const response = await fetch(questionsUrl, {})

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error loading questions:', errorData)
        throw new Error(
          'Failed to load questions: ' +
            (errorData.error || response.statusText)
        )
      }

      const data = await response.json()
      console.log('Questions data received:', data)

      if (!data.success || !Array.isArray(data.data)) {
        console.error('Invalid questions data format:', data)
        throw new Error('Invalid questions data format')
      }

      const questions = data.data

      if (!questions[questionIndex]) {
        throw new Error('Question not found')
      }

      setCurrentQuestion(questions[questionIndex])
    } catch (err) {
      console.error('Error loading question:', err)
      setError(err instanceof Error ? err.message : 'Failed to load question')
    }
  }

  const handleAnswerSubmit = async () => {
    if (!attempt || !currentQuestion || !selectedAnswer) {
      setError('Please select an answer before submitting')
      return
    }

    try {
      console.log('Submitting answer:', {
        attemptId: attempt.id,
        questionId: currentQuestion.id,
        answer: selectedAnswer,
      })

      const answerUrl = `${STUDY_API_URL}/attempts/${attempt.id}/answers`
      console.log('Submitting to:', answerUrl)

      const response = await fetch(answerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          answer: selectedAnswer,
          isCorrect: true, // TODO: Implement actual answer validation
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error submitting answer:', errorData)
        throw new Error(
          'Failed to submit answer: ' + (errorData.error || response.statusText)
        )
      }

      const data = await response.json()
      console.log('Answer submission response:', data)

      // Check if this was the last question
      if (attempt.currentQuestionIndex + 1 >= attempt.totalQuestions) {
        await completeAttempt()
      } else {
        // Update attempt with next question index
        const newAttempt = {
          ...attempt,
          currentQuestionIndex: attempt.currentQuestionIndex + 1,
        }
        setAttempt(newAttempt)
        await loadQuestion(attempt.id, newAttempt.currentQuestionIndex)
        setSelectedAnswer('')
      }
    } catch (err) {
      console.error('Error submitting answer:', err)
      setError(err instanceof Error ? err.message : 'Failed to submit answer')
    }
  }

  const completeAttempt = async () => {
    if (!attempt) return

    try {
      console.log('Completing attempt:', attempt.id)
      const completeUrl = `${STUDY_API_URL}/attempts/${attempt.id}/complete`
      console.log('Completing at:', completeUrl)

      const response = await fetch(completeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error completing attempt:', errorData)
        throw new Error(
          'Failed to complete attempt: ' +
            (errorData.error || response.statusText)
        )
      }

      const data = await response.json()
      console.log('Attempt completion response:', data)

      router.push(`/quiz-result/${attempt.id}`)
    } catch (err) {
      console.error('Error completing attempt:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to complete attempt'
      )
    }
  }

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
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!attempt || !currentQuestion) {
    return (
      <div className="m-4">
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Failed to load quiz
              </h3>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl p-4">
      <div className="overflow-hidden rounded-lg bg-white shadow">
        <div className="p-6">
          <h2 className="mb-6 text-2xl font-bold">
            Question {attempt.currentQuestionIndex + 1} of{' '}
            {attempt.totalQuestions}
          </h2>

          <p className="mb-8 text-lg">{currentQuestion.text}</p>

          <div className="space-y-4">
            {currentQuestion.options.map((option, index) => (
              <label
                key={index}
                className={clsx(
                  'flex cursor-pointer items-center rounded-lg border p-4 hover:bg-gray-50',
                  selectedAnswer === option
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200'
                )}
              >
                <input
                  type="radio"
                  name="answer"
                  value={option}
                  checked={selectedAnswer === option}
                  onChange={(e) => setSelectedAnswer(e.target.value)}
                  className="text-primary focus:ring-primary h-4 w-4 border-gray-300"
                />
                <span className="ml-3 block text-sm font-medium">{option}</span>
              </label>
            ))}
          </div>

          <div className="mt-8">
            <button
              onClick={handleAnswerSubmit}
              disabled={!selectedAnswer}
              className={clsx(
                'rounded-md px-4 py-2 text-sm font-semibold text-white shadow-sm',
                selectedAnswer
                  ? 'bg-primary hover:bg-primary/90'
                  : 'cursor-not-allowed bg-gray-300'
              )}
            >
              {attempt.currentQuestionIndex + 1 === attempt.totalQuestions
                ? 'Submit Quiz'
                : 'Next Question'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
