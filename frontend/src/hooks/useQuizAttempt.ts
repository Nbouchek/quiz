import { useState } from 'react'
import axios from 'axios'
import { STUDY_API_URL } from '@/config/constants'
import { QuizAttempt, Question } from '@/types/quiz'

interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  details?: string
}

export const useQuizAttempt = () => {
  console.log(
    'useQuizAttempt hook initialized, using STUDY_API_URL:',
    STUDY_API_URL
  )
  const [error, setError] = useState<string | null>(null)

  const axiosInstance = axios.create({
    baseURL: STUDY_API_URL,
    timeout: 10000,
    withCredentials: true,
    headers: {
      // Note: Do not set 'Origin' header here as browsers manage this automatically
      // and attempts to set it manually will be ignored with a console warning
      'Content-Type': 'application/json',
      Accept: 'application/json',
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
        data: config.data, // Log request data for better debugging
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
          requestData: error.config?.data, // Log request data for better debugging
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
      console.log(
        'startAttempt called with quizId:',
        quizId,
        'totalQuestions:',
        totalQuestions,
        'STUDY_API_URL:',
        STUDY_API_URL
      )

      // Validate quizId is a valid UUID
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          quizId
        )
      ) {
        console.error('Invalid quiz ID format:', quizId)
        throw new Error('Invalid quiz ID format')
      }

      // Validate totalQuestions
      if (totalQuestions <= 0) {
        console.error('Invalid totalQuestions:', totalQuestions)
        throw new Error('Quiz must have at least one question')
      }

      // Create the request payload
      const payload = {
        userId: '00000000-0000-0000-0000-000000000001', // Test UUID
        quizId,
        totalQuestions,
      }

      console.log('Starting quiz attempt with payload:', payload)

      // Log the full request URL for easier debugging
      const primaryEndpoint = `${STUDY_API_URL}/attempts`
      console.log('Full request URL (primary):', primaryEndpoint)

      try {
        // First try with the /attempts endpoint
        console.log('Trying primary endpoint:', primaryEndpoint)

        // Test if the API is reachable with a fetch-based ping
        try {
          const pingResponse = await fetch(`${STUDY_API_URL}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
          console.log(
            'API health check response:',
            pingResponse.status,
            pingResponse.ok
          )
        } catch (pingError) {
          console.error('API health check failed:', pingError)
        }

        // Try a direct fetch call first to debug any issues
        try {
          console.log('Trying direct fetch to:', primaryEndpoint)
          const directResponse = await fetch(primaryEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include',
          })

          console.log('Direct fetch response:', {
            status: directResponse.status,
            ok: directResponse.ok,
            statusText: directResponse.statusText,
          })

          if (directResponse.ok) {
            const data = await directResponse.json()
            console.log('Direct fetch successful with data:', data)
          } else {
            console.error(
              'Direct fetch failed with status:',
              directResponse.status
            )
            const errorText = await directResponse.text()
            console.error('Error response:', errorText)
          }
        } catch (fetchError) {
          console.error('Direct fetch error:', fetchError)
        }

        const response = await axiosInstance.post<ApiResponse<QuizAttempt>>(
          '/attempts',
          payload
        )

        if (!response.data?.success || !response.data?.data) {
          console.error('Invalid response format:', response.data)
          throw new Error(response.data?.error || 'Invalid response format')
        }

        const attempt = response.data.data
        console.log('Quiz attempt started successfully:', attempt)

        // Ensure all required fields are present
        if (!attempt.status || !attempt.totalQuestions) {
          console.error('Missing required fields in attempt:', attempt)
          throw new Error('Invalid attempt data: missing required fields')
        }

        return attempt
      } catch (err) {
        console.error('Error with /attempts endpoint:', err)

        // More detailed error logging
        if (axios.isAxiosError(err)) {
          console.error('Axios error details:', {
            status: err.response?.status,
            statusText: err.response?.statusText,
            data: err.response?.data,
            config: {
              url: err.config?.url,
              baseURL: err.config?.baseURL,
              method: err.config?.method,
              headers: err.config?.headers,
            },
          })
        }

        throw err
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to start quiz attempt'
      )
      throw error
    }
  }

  const getQuestions = async (attemptId: string): Promise<Question[]> => {
    try {
      console.log('Fetching questions for attempt:', attemptId)
      const response = await axiosInstance.get<ApiResponse<Question[]>>(
        `/attempts/${attemptId}/questions`
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

      // Ensure questionId is a valid UUID
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          questionId
        )
      ) {
        throw new Error('Invalid question ID format')
      }

      // Determine if the answer is correct (in a real app, this would be done on the server)
      // This is a temporary workaround - for production, the server should validate correctness
      const isCorrect = true // Assuming all answers are correct for now as a workaround

      // Debugging the exact request payload
      const payload = {
        questionId, // Send as a string - the Go server will parse it as UUID
        answer,
        isCorrect,
      }
      console.log('Request payload:', payload)

      // Make the API request
      const response = await axiosInstance.post<ApiResponse<void>>(
        `/attempts/${attemptId}/answers`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.data) {
        throw new Error('Invalid response format')
      }

      console.log('Answer submitted successfully')
    } catch (err) {
      console.error('Failed to submit answer:', err)
      if (axios.isAxiosError(err)) {
        // Get a more detailed error message from the response data
        let message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message
        if (err.response?.data?.details) {
          message += `: ${err.response.data.details}`
        }

        // Log the request that failed
        console.error('Failed request details:', {
          url: err.config?.url,
          method: err.config?.method,
          baseURL: err.config?.baseURL,
          headers: err.config?.headers,
          data: err.config?.data,
          responseStatus: err.response?.status,
          responseData: err.response?.data,
        })

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
        `/attempts/${attemptId}/complete`
      )

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format')
      }

      console.log('Quiz attempt completed:', response.data.data)
      return response.data.data
    } catch (err) {
      console.error('Failed to complete quiz attempt:', err)
      if (axios.isAxiosError(err)) {
        // Get more detailed error message
        let message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message
        if (err.response?.data?.details) {
          message += `: ${err.response.data.details}`
        }
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
      console.log('Using STUDY_API_URL:', STUDY_API_URL)

      // Check if we're on the correct service, but only in browser environment
      if (typeof window !== 'undefined') {
        const urlPath = window.location.pathname
        if (urlPath.includes('/attempts/') && window.location.port === '8083') {
          console.warn(
            'Detected incorrect service port! Redirecting to correct service.'
          )
          // Replace URL with correct service port
          const correctUrl = window.location.href.replace(
            'localhost:8083',
            'localhost:8084'
          )
          console.log('Redirecting to correct URL:', correctUrl)
          window.location.href = correctUrl
          throw new Error('Redirecting to correct service URL')
        }
      }

      const response = await axiosInstance.get<ApiResponse<QuizAttempt>>(
        `/attempts/${attemptId}`
      )

      if (!response.data || !response.data.data) {
        throw new Error('Invalid response format')
      }

      return response.data.data
    } catch (err) {
      console.error('Failed to get quiz attempt:', err)
      if (axios.isAxiosError(err)) {
        // Get more detailed error message
        let message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message
        if (err.response?.data?.details) {
          message += `: ${err.response.data.details}`
        }

        // Check if this is a CORS error to the wrong service
        if (
          err.message.includes('Network Error') ||
          err.message.includes('CORS')
        ) {
          console.error(
            'Possible CORS issue detected! Checking service URLs...'
          )
          console.error(`Expected service URL: ${STUDY_API_URL}`)
          console.error(
            `Current URL: ${typeof window !== 'undefined' ? window.location.href : 'Server-side rendering'}`
          )

          // Add debugging to help identify the issue
          if (err.config) {
            console.error('Request URL:', err.config?.url)
            console.error('Base URL:', err.config?.baseURL)
            console.error(
              'Full URL:',
              `${err.config?.baseURL || ''}${err.config?.url || ''}`
            )
          }
        }

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
