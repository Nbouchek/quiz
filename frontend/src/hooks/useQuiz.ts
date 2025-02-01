import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import type {
  Quiz,
  ApiResponse,
  CreateQuizInput,
  UpdateQuizInput,
} from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL

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
      const response = await axios.get<ApiResponse<Quiz>>(
        `${API_URL}/quizzes/${quizId}`
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
    },
    enabled: !!quizId && options.enabled !== false,
  })

  const createQuiz = useMutation<Quiz, AxiosError, CreateQuizInput>({
    mutationFn: async (input) => {
      console.log('Creating quiz with input:', JSON.stringify(input, null, 2))
      const response = await axios.post<ApiResponse<Quiz>>(
        `${API_URL}/quizzes`,
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
      queryClient.setQueryData(['quiz', newQuiz.id], newQuiz)
      queryClient.invalidateQueries({ queryKey: ['quizzes'] })
    },
  })

  const updateQuiz = useMutation<Quiz, AxiosError, UpdateQuizInput>({
    mutationFn: async (input) => {
      if (!quizId) throw new Error('Quiz ID is required')
      console.log('Updating quiz with input:', JSON.stringify(input, null, 2))
      const response = await axios.patch<ApiResponse<Quiz>>(
        `${API_URL}/quizzes/${quizId}`,
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
      await axios.delete(`${API_URL}/quizzes/${quizId}`)
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
