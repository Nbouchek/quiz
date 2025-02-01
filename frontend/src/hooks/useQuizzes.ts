import { useQuery } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import type { Quiz, ApiResponse } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL

export function useQuizzes() {
  const {
    data: quizzes,
    isLoading,
    error,
  } = useQuery<Quiz[], AxiosError>({
    queryKey: ['quizzes'],
    queryFn: async () => {
      const response = await axios.get<ApiResponse<Quiz[]>>(
        `${API_URL}/quizzes`
      )
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
