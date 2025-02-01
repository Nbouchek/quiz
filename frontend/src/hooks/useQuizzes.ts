import { useQuery } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import type { Quiz, ApiResponse } from '@/types'
import { QUIZ_API_URL } from '@/config/constants'

export function useQuizzes() {
  const {
    data: quizzes,
    isLoading,
    error,
    refetch
  } = useQuery<Quiz[], AxiosError>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      console.log('Fetching quizzes...')
      try {
        const response = await axios.get<ApiResponse<Quiz[]>>(QUIZ_API_URL)
        console.log('Raw API Response:', JSON.stringify(response.data, null, 2))

        if (!response.data.data) {
          console.error('No quizzes found in response:', response.data)
          throw new Error('No quizzes found')
        }

        console.log('Parsed quizzes:', response.data.data)
        return response.data.data
      } catch (error) {
        console.error('Error fetching quizzes:', error)
        throw error
      }
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
    retry: 3,
  })

  console.log('useQuizzes hook state:', { quizzes, isLoading, error })

  return {
    quizzes,
    isLoading,
    error,
    refetch
  }
}
