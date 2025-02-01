import { useQuery } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import type { Quiz, ApiResponse } from '@/types'
import { QUIZ_API_URL } from '@/config/constants'

export function useQuizzes() {
  const {
    data: quizzes,
    isLoading,
    error,
  } = useQuery<Quiz[], AxiosError>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const response = await axios.get<ApiResponse<Quiz[]>>(QUIZ_API_URL)
      if (!response.data.data) {
        throw new Error('No quizzes found')
      }
      return response.data.data
    },
  })

  return {
    quizzes,
    isLoading,
    error,
  }
}
