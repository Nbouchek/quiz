import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import React from 'react'
import type { Quiz } from '@/types'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

export function createWrapper() {
  const queryClient = createQueryClient()
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

export function renderWithClient(ui: React.ReactElement) {
  const queryClient = createQueryClient()
  const { rerender, ...result } = render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  )
  return {
    ...result,
    rerender: (rerenderUi: React.ReactElement) =>
      rerender(
        <QueryClientProvider client={queryClient}>
          {rerenderUi}
        </QueryClientProvider>
      ),
  }
}

export const mockQuiz: Quiz = {
  id: '1',
  title: 'Test Quiz',
  description: 'A test quiz description',
  topicId: '1',
  creatorId: 'user-1',
  questions: [
    {
      id: '1',
      quizId: '1',
      text: 'Test question',
      type: 'multiple_choice',
      options: ['Option 1', 'Option 2'],
      correctAnswer: 'Option 1',
      explanation: 'This is a test explanation',
      createdAt: '2024-01-25T12:00:00Z',
      updatedAt: '2024-01-25T12:00:00Z',
    },
  ],
  createdAt: '2024-01-25T12:00:00Z',
  updatedAt: '2024-01-25T12:00:00Z',
}
