import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { useQuiz, type CreateQuizInput, type UpdateQuizInput } from '../useQuiz'
import { createWrapper, mockQuiz } from '../../test/utils'
import type { ApiResponse, Quiz } from '../../types'

// Mock API URL
const API_URL = 'http://localhost:8082'

// Mock error responses
const mockErrors = {
  validation: { message: 'Validation failed', code: 'VALIDATION_ERROR' },
  notFound: { message: 'Not found', code: 'NOT_FOUND' },
  unauthorized: { message: 'Unauthorized', code: 'UNAUTHORIZED' },
  server: { message: 'Internal server error', code: 'SERVER_ERROR' },
}

const server = setupServer(
  // Default handlers
  http.get(`${API_URL}/quizzes/:quizId`, () => {
    return HttpResponse.json<ApiResponse<Quiz>>({ data: mockQuiz })
  }),

  http.post(`${API_URL}/quizzes`, () => {
    return HttpResponse.json<ApiResponse<Quiz>>({ data: mockQuiz })
  }),

  http.patch(`${API_URL}/quizzes/:quizId`, async ({ request }) => {
    const body = (await request.json()) as UpdateQuizInput
    const updatedQuiz = { ...mockQuiz, ...body } as Quiz
    return HttpResponse.json<ApiResponse<Quiz>>({ data: updatedQuiz })
  }),

  http.delete(`${API_URL}/quizzes/:quizId`, () => {
    return new HttpResponse(null, { status: 204 })
  })
)

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  jest.clearAllMocks()
})
afterAll(() => server.close())

describe('useQuiz', () => {
  describe('fetching quiz', () => {
    it('fetches quiz data successfully', async () => {
      const { result } = renderHook(() => useQuiz('1'), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(true)
      expect(result.current.quiz).toBeUndefined()

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      expect(result.current.quiz).toEqual(mockQuiz)
      expect(result.current.error).toBeNull()
    })

    it('handles quiz not found', async () => {
      server.use(
        http.get(`${API_URL}/quizzes/:quizId`, () => {
          return HttpResponse.json<ApiResponse<Quiz | null>>(
            { error: mockErrors.notFound },
            { status: 404 }
          )
        })
      )

      const { result } = renderHook(() => useQuiz('999'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error?.response?.status).toBe(404)
      })

      expect(result.current.quiz).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('handles server error', async () => {
      server.use(
        http.get(`${API_URL}/quizzes/:quizId`, () => {
          return HttpResponse.json(
            { error: mockErrors.server },
            { status: 500 }
          )
        })
      )

      const { result } = renderHook(() => useQuiz('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.error?.response?.status).toBe(500)
      })

      expect(result.current.quiz).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
    })

    it('respects enabled option', () => {
      const { result } = renderHook(() => useQuiz('1', { enabled: false }), {
        wrapper: createWrapper(),
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.quiz).toBeUndefined()
      expect(result.current.error).toBeNull()
    })
  })

  describe('creating quiz', () => {
    const validQuiz: CreateQuizInput = {
      title: 'New Quiz',
      description: 'A new quiz description',
      questions: [
        {
          text: 'New question',
          type: 'multiple_choice',
          options: [{ text: 'Option 1' }, { text: 'Option 2' }],
          correctOptionId: '1',
        },
      ],
    }

    it('creates quiz successfully', async () => {
      const { result } = renderHook(() => useQuiz(), {
        wrapper: createWrapper(),
      })

      result.current.createQuiz.mutate(validQuiz)

      await waitFor(() => {
        expect(result.current.createQuiz.isSuccess).toBe(true)
      })

      expect(result.current.createQuiz.data).toEqual(mockQuiz)
    })

    it('handles validation error', async () => {
      server.use(
        http.post(`${API_URL}/quizzes`, () => {
          return HttpResponse.json(
            { error: mockErrors.validation },
            { status: 400 }
          )
        })
      )

      const { result } = renderHook(() => useQuiz(), {
        wrapper: createWrapper(),
      })

      result.current.createQuiz.mutate({
        title: '',
        description: '',
        questions: [],
      })

      await waitFor(() => {
        expect(result.current.createQuiz.isError).toBe(true)
      })

      expect(result.current.createQuiz.error?.response?.status).toBe(400)
    })

    it('handles unauthorized error', async () => {
      server.use(
        http.post(`${API_URL}/quizzes`, () => {
          return HttpResponse.json(
            { error: mockErrors.unauthorized },
            { status: 401 }
          )
        })
      )

      const { result } = renderHook(() => useQuiz(), {
        wrapper: createWrapper(),
      })

      result.current.createQuiz.mutate(validQuiz)

      await waitFor(() => {
        expect(result.current.createQuiz.isError).toBe(true)
      })

      expect(result.current.createQuiz.error?.response?.status).toBe(401)
    })
  })

  describe('updating quiz', () => {
    it('updates quiz successfully', async () => {
      const { result } = renderHook(() => useQuiz('1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })

      const update: UpdateQuizInput = { title: 'Updated Quiz' }
      result.current.updateQuiz.mutate(update)

      await waitFor(() => {
        expect(result.current.updateQuiz.isSuccess).toBe(true)
      })

      expect(result.current.updateQuiz.data?.title).toBe(update.title)
    })

    it('handles not found error', async () => {
      server.use(
        http.patch(`${API_URL}/quizzes/:quizId`, () => {
          return HttpResponse.json(
            { error: mockErrors.notFound },
            { status: 404 }
          )
        })
      )

      const { result } = renderHook(() => useQuiz('999'), {
        wrapper: createWrapper(),
      })

      result.current.updateQuiz.mutate({ title: 'Updated Quiz' })

      await waitFor(() => {
        expect(result.current.updateQuiz.isError).toBe(true)
      })

      expect(result.current.updateQuiz.error?.response?.status).toBe(404)
    })

    it('validates quiz ID requirement', async () => {
      const { result } = renderHook(() => useQuiz(), {
        wrapper: createWrapper(),
      })

      result.current.updateQuiz.mutate({ title: 'Updated Quiz' })

      await waitFor(() => {
        expect(result.current.updateQuiz.isError).toBe(true)
      })

      expect(result.current.updateQuiz.error?.message).toBe(
        'Quiz ID is required'
      )
    })
  })

  describe('deleting quiz', () => {
    it('deletes quiz successfully', async () => {
      const { result } = renderHook(() => useQuiz('1'), {
        wrapper: createWrapper(),
      })

      result.current.deleteQuiz.mutate()

      await waitFor(() => {
        expect(result.current.deleteQuiz.isSuccess).toBe(true)
      })
    })

    it('handles not found error', async () => {
      server.use(
        http.delete(`${API_URL}/quizzes/:quizId`, () => {
          return HttpResponse.json(
            { error: mockErrors.notFound },
            { status: 404 }
          )
        })
      )

      const { result } = renderHook(() => useQuiz('999'), {
        wrapper: createWrapper(),
      })

      result.current.deleteQuiz.mutate()

      await waitFor(() => {
        expect(result.current.deleteQuiz.isError).toBe(true)
      })

      expect(result.current.deleteQuiz.error?.response?.status).toBe(404)
    })

    it('validates quiz ID requirement', async () => {
      const { result } = renderHook(() => useQuiz(), {
        wrapper: createWrapper(),
      })

      result.current.deleteQuiz.mutate()

      await waitFor(() => {
        expect(result.current.deleteQuiz.isError).toBe(true)
      })

      expect(result.current.deleteQuiz.error?.message).toBe(
        'Quiz ID is required'
      )
    })
  })
})
