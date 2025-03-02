import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import type {
  Quiz,
  ApiResponse,
  CreateQuizInput,
  UpdateQuizInput,
} from '@/types'
import { API_BASE_URL, QUIZ_API_URL } from '@/config/constants'

interface UseQuizOptions {
  enabled?: boolean
}

export function useQuiz(quizId?: string, options: UseQuizOptions = {}) {
  const queryClient = useQueryClient()

  const {
    data: quiz,
    isLoading,
    error,
  } = useQuery<Quiz, AxiosError>({
    queryKey: ['quiz', quizId],
    queryFn: async () => {
      if (!quizId) throw new Error('Quiz ID is required')
      console.log('Fetching quiz:', quizId)

      const url = `${QUIZ_API_URL}/quizzes/${quizId}`
      console.log('Fetching quiz from:', url)

      try {
        // Create axios instance with default config
        const axiosInstance = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          withCredentials: true,
          headers: {
            // Note: Do not set 'Origin' header here as browsers manage this automatically
            // and attempts to set it manually will be ignored with a console warning
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })

        // Add request interceptor for debugging
        axiosInstance.interceptors.request.use(
          (config) => {
            // Note: We avoid modifying headers like 'Origin' which are protected by browsers
            console.log('Request config:', {
              url: config.url,
              method: config.method,
              headers: config.headers,
              withCredentials: config.withCredentials,
              baseURL: config.baseURL,
              fullPath: `${config.baseURL}${config.url}`,
            })
            return config
          },
          (error) => {
            console.error('Request interceptor error:', error)
            return Promise.reject(error)
          }
        )

        // Add response interceptor for debugging
        axiosInstance.interceptors.response.use(
          (response) => {
            console.log('Response interceptor:', {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
              data: response.data,
              url: response.config?.url,
              baseURL: response.config?.baseURL,
            })
            return response
          },
          (error) => {
            if (axios.isAxiosError(error) && error.response) {
              console.error('Response error:', {
                status: error.response.status,
                statusText: error.response.statusText,
                headers: error.response.headers,
                data: error.response.data,
                url: error.config?.url,
                baseURL: error.config?.baseURL,
                fullUrl: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
                method: error.config?.method,
                requestHeaders: error.config?.headers,
              })
            }
            return Promise.reject(error)
          }
        )

        const response = await axios.get<ApiResponse<Quiz>>(
          `${QUIZ_API_URL}/quizzes/${quizId}`
        )
        console.log('Raw API Response:', JSON.stringify(response.data, null, 2))

        if (!response.data || !response.data.data) {
          console.error('Invalid response format:', response.data)
          throw new Error('Quiz not found')
        }

        const quizData = response.data.data
        console.log('Quiz data:', JSON.stringify(quizData, null, 2))

        // Validate question structure
        if (Array.isArray(quizData.questions)) {
          quizData.questions.forEach((question, index) => {
            console.log(
              `Question ${index + 1} structure:`,
              JSON.stringify(question, null, 2)
            )
            if (Array.isArray(question.options)) {
              console.log(
                `Question ${index + 1} options:`,
                JSON.stringify(question.options, null, 2)
              )
            } else {
              console.error(
                `Invalid options for question ${index + 1}:`,
                question.options
              )
            }
          })
        } else {
          console.error('Questions is not an array:', quizData.questions)
        }

        return quizData
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.message || error.message
          console.error('API Error:', {
            message: errorMessage,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            fullUrl: `${error.config?.baseURL ?? ''}${error.config?.url ?? ''}`,
            method: error.config?.method,
            requestHeaders: error.config?.headers,
          })

          // Handle specific error cases
          if (error.response?.status === 401) {
            throw new Error('Please log in to view this quiz')
          } else if (error.response?.status === 403) {
            throw new Error('You do not have permission to view this quiz')
          } else if (error.response?.status === 404) {
            throw new Error('Quiz not found')
          } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timed out. Please try again')
          } else if (error.code === 'ERR_NETWORK') {
            throw new Error(
              'Network error. Please check your connection and try again'
            )
          }

          throw new Error(`Failed to fetch quiz: ${errorMessage}`)
        }
        console.error('Unexpected error:', error)
        throw new Error('An unexpected error occurred while fetching the quiz')
      }
    },
    enabled: !!quizId && options.enabled !== false,
    staleTime: 0,
    retry: (failureCount, error) => {
      if (error instanceof Error) {
        if (
          error.message.includes('Please log in') ||
          error.message.includes('permission') ||
          error.message.includes('not found')
        ) {
          return false
        }
      }
      return failureCount < 3
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })

  const createQuiz = useMutation<Quiz, AxiosError, CreateQuizInput>({
    mutationFn: async (input) => {
      console.log('Creating quiz with input:', JSON.stringify(input, null, 2))
      const response = await axios.post<ApiResponse<Quiz>>(
        `${QUIZ_API_URL}/quizzes/`,
        {
          ...input,
          questions: input.questions.map((q) => ({
            ...q,
            type: q.type || 'multiple_choice',
          })),
        }
      )
      console.log(
        'Create quiz response:',
        JSON.stringify(response.data, null, 2)
      )
      if (!response.data || !response.data.data) {
        throw new Error('Failed to create quiz')
      }
      return response.data.data
    },
    onSuccess: (newQuiz) => {
      console.log('Quiz created successfully:', newQuiz)
      queryClient.setQueryData(['quiz', newQuiz.id], newQuiz)
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
    onError: (error) => {
      console.error('Failed to create quiz:', error)
    },
  })

  const updateQuiz = useMutation<Quiz, AxiosError, UpdateQuizInput>({
    mutationFn: async (input) => {
      if (!quizId) throw new Error('Quiz ID is required')
      console.log('Updating quiz with input:', JSON.stringify(input, null, 2))
      const response = await axios.patch<ApiResponse<Quiz>>(
        `${QUIZ_API_URL}/quizzes/${quizId}`,
        {
          ...input,
          questions: input.questions?.map((q) => ({
            ...q,
            type: q.type || 'multiple_choice',
          })),
        }
      )
      console.log(
        'Update quiz response:',
        JSON.stringify(response.data, null, 2)
      )
      if (!response.data || !response.data.data) {
        throw new Error('Failed to update quiz')
      }
      return response.data.data
    },
    onSuccess: (updatedQuiz) => {
      queryClient.setQueryData(['quiz', updatedQuiz.id], updatedQuiz)
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
  })

  const deleteQuiz = useMutation<void, AxiosError, void>({
    mutationFn: async () => {
      if (!quizId) throw new Error('Quiz ID is required')
      await axios.delete(`${QUIZ_API_URL}/quizzes/${quizId}`)
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['quiz', quizId] })
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
  })

  return {
    quiz,
    isLoading,
    error,
    createQuiz,
    updateQuiz,
    deleteQuiz,
  }
}
