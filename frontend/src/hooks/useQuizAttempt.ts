import { useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '@/config/constants'
import { QuizAttempt, Question } from '@/types/quiz'

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  details?: string
}

export const useQuizAttempt = () => {
  const [error, setError] = useState<string | null>(null)

  const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Origin: window.location.origin,
    },
  })

  // Add request interceptor for debugging
  axiosInstance.interceptors.request.use(
    (config) => {
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

  const startAttempt = async (
    quizId: string,
    totalQuestions: number
  ): Promise<QuizAttempt> => {
    try {
      console.log('Starting quiz attempt:', { quizId, totalQuestions })
      const response = await axiosInstance.post<ApiResponse<QuizAttempt>>(
        '/study/attempts',
        {
          userId: '00000000-0000-0000-0000-000000000001', // Test UUID
          quizId,
          totalQuestions,
        }
      )

      if (!response.data?.success || !response.data?.data) {
        console.error('Invalid response format:', response.data)
        throw new Error(response.data?.error || 'Invalid response format')
      }

      const attempt = response.data.data
      console.log('Quiz attempt started:', attempt)

      // Ensure all required fields are present
      if (!attempt.status || !attempt.totalQuestions) {
        console.error('Missing required fields in attempt:', attempt)
        throw new Error('Invalid attempt data: missing required fields')
      }

      return attempt
    } catch (err) {
      console.error('Failed to start quiz attempt:', err)
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error || err.message
        setError(message)
        throw new Error(message)
      }
      const message =
        err instanceof Error ? err.message : 'Failed to start quiz attempt'
      setError(message)
      throw new Error(message)
    }
  }

  const getQuestions = async (attemptId: string): Promise<Question[]> => {
    try {
      console.log('Fetching questions for attempt:', attemptId)
      const response = await axiosInstance.get<ApiResponse<Question[]>>(
        `/study/attempts/${attemptId}/questions`
      )

      if (!response.data?.success || !response.data?.data) {
        console.error('Invalid response format:', response.data)
        throw new Error(response.data?.error || 'Invalid response format')
      }

      const questions = response.data.data
      console.log('Questions fetched:', questions)

      // Validate questions
      if (!Array.isArray(questions) || questions.length === 0) {
        throw new Error('No questions available')
      }

      return questions
    } catch (err) {
      console.error('Failed to get quiz questions:', err)
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error || err.message
        setError(message)
        throw new Error(message)
      }
      const message =
        err instanceof Error ? err.message : 'Failed to get quiz questions'
      setError(message)
      throw new Error(message)
    }
  }

  const submitAnswer = async (
    attemptId: string,
    questionId: string,
    answer: string
  ): Promise<void> => {
    try {
      console.log('Submitting answer:', { attemptId, questionId, answer })
      const response = await axiosInstance.post<ApiResponse<void>>(
        `/study/attempts/${attemptId}/answers`,
        {
          questionId,
          answer,
        }
      )

      if (!response.data) {
        throw new Error('Invalid response format')
      }

      console.log('Answer submitted successfully')
    } catch (err) {
      console.error('Failed to submit answer:', err)
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || err.message
        setError(message)
        throw new Error(message)
      }
      const message =
        err instanceof Error ? err.message : 'Failed to submit answer'
      setError(message)
      throw new Error(message)
    }
  }

  const completeAttempt = async (attemptId: string): Promise<QuizAttempt> => {
    try {
      console.log('Completing quiz attempt:', attemptId)
      const response = await axiosInstance.post<ApiResponse<QuizAttempt>>(
        `/study/attempts/${attemptId}/complete`
      )

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format')
      }

      console.log('Quiz attempt completed:', response.data.data)
      return response.data.data
    } catch (err) {
      console.error('Failed to complete quiz attempt:', err)
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || err.message
        setError(message)
        throw new Error(message)
      }
      const message =
        err instanceof Error ? err.message : 'Failed to complete quiz attempt'
      setError(message)
      throw new Error(message)
    }
  }

  const getAttempt = async (attemptId: string): Promise<QuizAttempt> => {
    try {
      console.log('Fetching quiz attempt:', attemptId)
      const response = await axiosInstance.get<ApiResponse<QuizAttempt>>(
        `/study/attempts/${attemptId}`
      )

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format')
      }

      return response.data.data
    } catch (err) {
      console.error('Failed to get quiz attempt:', err)
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.message || err.message
        setError(message)
        throw new Error(message)
      }
      const message =
        err instanceof Error ? err.message : 'Failed to get quiz attempt'
      setError(message)
      throw new Error(message)
    }
  }

  return {
    startAttempt,
    getQuestions,
    submitAnswer,
    completeAttempt,
    getAttempt,
    error,
  }
}
