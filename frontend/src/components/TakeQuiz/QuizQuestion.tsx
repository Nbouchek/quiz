import React, { useState } from 'react'
import { RadioGroup } from '@headlessui/react'
import { CheckCircleIcon } from '@heroicons/react/24/solid'
import { Question } from '../../types/quiz'
import { cn } from '../../utils/cn'

interface QuizQuestionProps {
  question: Question
  onSubmit: (questionId: string, answer: string) => void
  isSubmitting: boolean
  currentQuestionNumber: number
  totalQuestions: number
}

interface RadioOptionRenderProps {
  active: boolean
  checked: boolean
  disabled: boolean
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onSubmit,
  isSubmitting,
  currentQuestionNumber,
  totalQuestions,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState('')

  const handleSubmit = () => {
    if (selectedAnswer) {
      onSubmit(question.id, selectedAnswer)
      setSelectedAnswer('')
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm font-medium text-gray-600">
          <span>Question {currentQuestionNumber} of {totalQuestions}</span>
          <span className="text-indigo-600">{Math.round((currentQuestionNumber / totalQuestions) * 100)}% Complete</span>
        </div>
        <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-indigo-600 transition-all duration-300 ease-in-out"
            style={{ width: `${(currentQuestionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">{question.text}</h2>
      </div>

      {/* Options */}
      <div className="space-y-4">
        <RadioGroup value={selectedAnswer} onChange={setSelectedAnswer} disabled={isSubmitting}>
          <div className="space-y-3">
            {question.options.map((option, index) => (
              <RadioGroup.Option
                key={index}
                value={option}
                className={({ active, checked }: RadioOptionRenderProps) =>
                  cn(
                    'relative flex cursor-pointer rounded-lg px-5 py-4 shadow-md focus:outline-none',
                    active && 'ring-2 ring-indigo-600 ring-offset-2',
                    checked
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white hover:bg-gray-50',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )
                }
              >
                {({ checked }: { checked: boolean }) => (
                  <>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center">
                        <div className="text-sm">
                          <RadioGroup.Label
                            as="p"
                            className={cn(
                              'font-medium',
                              checked ? 'text-white' : 'text-gray-900'
                            )}
                          >
                            {option}
                          </RadioGroup.Label>
                        </div>
                      </div>
                      {checked && (
                        <div className="shrink-0 text-white">
                          <CheckCircleIcon className="h-6 w-6" />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </RadioGroup.Option>
            ))}
          </div>
        </RadioGroup>
      </div>

      {/* Submit button */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!selectedAnswer || isSubmitting}
          className={cn(
            'rounded-md px-6 py-2.5 text-sm font-semibold text-white shadow-sm',
            !selectedAnswer || isSubmitting
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
          )}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </button>
      </div>
    </div>
  )
}

export default QuizQuestion
