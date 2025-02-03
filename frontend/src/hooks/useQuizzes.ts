import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { Quiz, ApiResponse } from '@/types'
import { API_BASE_URL } from '@/config/constants'

export function useQuizzes() {
  const {
    data: quizzes,
    isLoading,
    error,
    refetch,
  } = useQuery<Quiz[], Error>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const url = `${API_BASE_URL}/content/quizzes/`
      console.log('Fetching quizzes from:', url)
      try {
        // First, send a preflight request
        try {
          await axios.options(url, {
            headers: {
              'Access-Control-Request-Method': 'GET',
              'Access-Control-Request-Headers': 'content-type',
              Origin: 'http://localhost:3000',
            },
          })
        } catch (preflightError) {
          console.warn('Preflight request failed:', preflightError)
          // Continue anyway as the actual request might still work
        }

        // Create axios instance with default config
        const axiosInstance = axios.create({
          baseURL: API_BASE_URL,
          timeout: 10000,
          withCredentials: true,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Origin: 'http://localhost:3000',
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
                url: error.config?.url || 'unknown',
                baseURL: error.config?.baseURL || 'unknown',
              })
            }
            return Promise.reject(error)
          }
        )

        const response =
          await axiosInstance.get<ApiResponse<Quiz[]>>('/content/quizzes/')

        if (!response.data) {
          console.error('No data in response')
          throw new Error('No data received from server')
        }

        if (!response.data.data || !Array.isArray(response.data.data)) {
          console.error('Invalid data format:', response.data)
          throw new Error('Invalid data format received from server')
        }

        const quizzes = response.data.data
        console.log('Successfully fetched quizzes:', quizzes)
        return quizzes
      } catch (error) {
        if (axios.isAxiosError(error)) {
          const errorMessage = error.response?.data?.message || error.message
          console.error('API Error:', {
            message: errorMessage,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            headers: error.response?.headers,
            url: error.config?.url,
            baseURL: error.config?.baseURL,
            fullUrl: error.config?.baseURL + error.config?.url,
            method: error.config?.method,
            requestHeaders: error.config?.headers,
          })

          // Handle specific error cases
          if (error.response?.status === 401) {
            throw new Error('Please log in to view quizzes')
          } else if (error.response?.status === 403) {
            throw new Error('You do not have permission to view quizzes')
          } else if (error.response?.status === 404) {
            throw new Error(
              `Quiz service not found at ${error.config?.baseURL || ''}${
                error.config?.url || ''
              }. Please check the API configuration.`
            )
          } else if (error.code === 'ECONNABORTED') {
            throw new Error('Request timed out. Please try again')
          } else if (error.code === 'ERR_NETWORK') {
            throw new Error(
              'Network error. Please check your connection and the API server status'
            )
          }

          throw new Error(`Failed to fetch quizzes: ${errorMessage}`)
        } else {
          console.error('Unexpected error:', error)
          throw new Error('An unexpected error occurred while fetching quizzes')
        }
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: (failureCount, error) => {
      // Don't retry on certain error types
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

  console.log('useQuizzes hook state:', {
    quizzes,
    isLoading,
    error: error ? { message: error.message, stack: error.stack } : null,
  })

  return {
    quizzes,
    isLoading,
    error,
    refetch,
  }
}
