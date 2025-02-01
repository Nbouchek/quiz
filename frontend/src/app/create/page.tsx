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

    try {
      const response = await createQuiz.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        questions: questions.map((q) => ({
          text: q.text.trim(),
          type: q.type,
          options: q.options.map((opt) => opt.trim()),
          correctAnswer: q.correctAnswer.trim(),
          explanation: q.explanation?.trim() || '',
        })),
      })

      router.push(`/quizzes/${response.id}`)
    } catch (error) {
      console.error('Failed to create quiz:', error)
      setError('Failed to create quiz. Please try again.')
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
    </div>
  )
}
