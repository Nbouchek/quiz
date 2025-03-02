'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuiz } from '@/hooks/useQuiz'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

interface Question {
  text: string
  type: 'multiple_choice'
  options: string[]
  correctAnswer: string
  explanation?: string
}

export default function CreateQuizPage() {
  const router = useRouter()
  const createQuiz = useQuiz().createQuiz
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([
    {
      text: '',
      type: 'multiple_choice' as const,
      options: ['', ''],
      correctAnswer: '',
    },
  ])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!title.trim()) {
      setError('Please enter a title')
      return
    }

    if (!description.trim()) {
      setError('Please enter a description')
      return
    }

    if (questions.some((q) => !q.text.trim())) {
      setError('Please fill in all question texts')
      return
    }

    if (questions.some((q) => !q.correctAnswer)) {
      setError('Please select correct answers for all questions')
      return
    }

    // Show confirmation dialog instead of submitting immediately
    setShowConfirmation(true)
  }

  const handleConfirmSubmit = async () => {
    try {
      await createQuiz.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        topicId: '00000000-0000-0000-0000-000000000001',
        questions: questions.map((q) => ({
          text: q.text.trim(),
          type: q.type,
          options: q.options.map((opt) => opt.trim()),
          correctAnswer: q.correctAnswer.trim(),
          explanation: q.explanation?.trim() || '',
        })),
      })

      // Navigate to explore page to see the new quiz
      router.push('/explore')
    } catch (error) {
      console.error('Failed to create quiz:', error)
      setError('Failed to create quiz. Please try again.')
    } finally {
      setShowConfirmation(false)
    }
  }

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        type: 'multiple_choice' as const,
        options: ['', ''],
        correctAnswer: '',
      },
    ])
  }

  const removeQuestion = (index: number) => {
    if (questions.length > 1) {
      const updatedQuestions = [...questions]
      updatedQuestions.splice(index, 1)
      setQuestions(updatedQuestions)
    }
  }

  const updateQuestion = (index: number, field: string, value: string) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = {
      ...updatedQuestions[index],
      [field]: value,
    }
    setQuestions(updatedQuestions)
  }

  const addOption = (questionIndex: number) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options.push('')
    setQuestions(updatedQuestions)
  }

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions]
    const question = updatedQuestions[questionIndex]

    // If removing the correct option, reset correctAnswer
    if (question.options[optionIndex] === question.correctAnswer) {
      question.correctAnswer = ''
    }

    question.options.splice(optionIndex, 1)
    setQuestions(updatedQuestions)
  }

  const updateOption = (
    questionIndex: number,
    optionIndex: number,
    value: string
  ) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options[optionIndex] = value
    setQuestions(updatedQuestions)
  }

  const setCorrectOption = (questionIndex: number, optionIndex: number) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].correctAnswer =
      updatedQuestions[questionIndex].options[optionIndex]
    setQuestions(updatedQuestions)
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-8 text-3xl font-bold">Create a New Quiz</h1>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">{error}</h3>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            placeholder="Enter quiz title"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            placeholder="Enter quiz description"
          />
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Questions</h2>
            <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              Add Question
            </button>
          </div>

          {questions.map((question, questionIndex) => (
            <div
              key={questionIndex}
              className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-medium">
                  Question {questionIndex + 1}
                </h3>
                {questions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(questionIndex)}
                    className="ml-4 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>

              <div className="mt-4">
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) =>
                    updateQuestion(questionIndex, 'text', e.target.value)
                  }
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  placeholder="Enter question text"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                <div className="mt-2 space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div
                      key={optionIndex}
                      className="flex items-center space-x-2"
                    >
                      <input
                        type="radio"
                        name={`correct-${questionIndex}`}
                        checked={option === question.correctAnswer}
                        onChange={() =>
                          setCorrectOption(questionIndex, optionIndex)
                        }
                        className="h-4 w-4 border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <input
                        type="text"
                        value={option}
                        onChange={(e) =>
                          updateOption(
                            questionIndex,
                            optionIndex,
                            e.target.value
                          )
                        }
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                        placeholder={`Option ${optionIndex + 1}`}
                      />
                      {question.options.length > 2 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeOption(questionIndex, optionIndex)
                          }
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => addOption(questionIndex)}
                  className="mt-2 inline-flex items-center text-sm text-green-600 hover:text-green-700"
                >
                  <PlusIcon className="mr-1 h-4 w-4" />
                  Add Option
                </button>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Explanation (Optional)
                </label>
                <textarea
                  value={question.explanation || ''}
                  onChange={(e) =>
                    updateQuestion(questionIndex, 'explanation', e.target.value)
                  }
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
                  placeholder="Explain why the correct answer is correct"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Create Quiz
          </button>
        </div>
      </form>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pb-20 pt-4 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

            <div className="inline-block transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6 sm:align-middle">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Create Quiz
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Are you sure you want to create this quiz? This action
                      cannot be undone.
                    </p>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Quiz Summary:
                      </h4>
                      <ul className="mt-2 list-inside list-disc text-sm text-gray-600">
                        <li>Title: {title}</li>
                        <li>Description: {description}</li>
                        <li>Number of Questions: {questions.length}</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleConfirmSubmit}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Create Quiz
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmation(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
