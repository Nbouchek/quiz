import { render, screen } from '@testing-library/react'
import { QuizCard } from '../QuizCard'
import { mockQuiz } from '@/test/utils'
import type { Quiz } from '@/types'

describe('QuizCard', () => {
  it('renders quiz information correctly', () => {
    render(<QuizCard quiz={mockQuiz} />)

    // Check if title is rendered
    expect(screen.getByText(mockQuiz.title)).toBeInTheDocument()

    // Check if description is rendered
    expect(screen.getByText(mockQuiz.description)).toBeInTheDocument()

    // Check if question count is rendered
    expect(
      screen.getByText(`${mockQuiz.questions.length} questions`)
    ).toBeInTheDocument()

    // Check if creation time is rendered with dynamic content
    expect(screen.getByText(/Created .* ago/)).toBeInTheDocument()
  })

  it('applies custom className when provided', () => {
    const customClass = 'custom-class'
    render(<QuizCard quiz={mockQuiz} className={customClass} />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass(customClass)
    // Check if default classes are also applied
    expect(link).toHaveClass('block', 'rounded-lg', 'border')
  })

  it('links to the correct quiz page', () => {
    render(<QuizCard quiz={mockQuiz} />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', `/quizzes/${mockQuiz.id}`)
  })

  it('displays formatted date correctly', () => {
    // Mock the current date to make the test deterministic
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2024-01-26T12:00:00Z'))

    render(<QuizCard quiz={mockQuiz} />)

    // The mockQuiz date is '2024-01-25T12:00:00Z', so it should show "1 day ago"
    expect(screen.getByText('Created 1 day ago')).toBeInTheDocument()

    jest.useRealTimers()
  })

  it('handles long quiz descriptions', () => {
    const longQuiz: Quiz = {
      ...mockQuiz,
      description: 'A'.repeat(200), // Create a long description
    }

    render(<QuizCard quiz={longQuiz} />)
    const description = screen.getByText('A'.repeat(200))
    expect(description).toBeInTheDocument()
    expect(description).toHaveClass('text-sm', 'text-gray-700')
  })

  it('handles quiz with no questions', () => {
    const emptyQuiz: Quiz = {
      ...mockQuiz,
      questions: [],
    }

    render(<QuizCard quiz={emptyQuiz} />)
    expect(screen.getByText('0 questions')).toBeInTheDocument()
  })

  it('handles quiz with many questions', () => {
    const manyQuestionsQuiz: Quiz = {
      ...mockQuiz,
      questions: Array(100)
        .fill(null)
        .map((_, index) => ({
          id: `${index + 1}`,
          text: `Question ${index + 1}`,
          type: 'multiple_choice',
          options: [
            { id: '1', text: 'Option 1' },
            { id: '2', text: 'Option 2' },
          ],
          correctOptionId: '1',
        })),
    }

    render(<QuizCard quiz={manyQuestionsQuiz} />)
    expect(screen.getByText('100 questions')).toBeInTheDocument()
  })
})
