import { useState } from 'react'
import axios from 'axios'
import { QuizAttempt, Question } from '../types/quiz'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8082'

export const useQuizAttempt = () => {
  const [error, setError] = useState<string | null>(null)

  const startAttempt = async (
    quizId: string,
    totalQuestions: number
  ): Promise<QuizAttempt> => {
    try {
      const response = await axios.post(`${API_URL}/study/attempts`, {
        quizId,
        totalQuestions,
        userId: '00000000-0000-0000-0000-000000000001', // TODO: Get from auth context
      })
      return response.data.data
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to start quiz attempt'
      setError(message)
      throw new Error(message)
    }
  }

  const getQuestions = async (attemptId: string): Promise<Question[]> => {
    try {
      const response = await axios.get(
        `${API_URL}/study/attempts/${attemptId}/questions`
      )
      return response.data.data
    } catch (err) {
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
      await axios.post(`${API_URL}/study/attempts/${attemptId}/answers`, {
        questionId,
        answer,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to submit answer'
      setError(message)
      throw new Error(message)
    }
  }

  const completeAttempt = async (attemptId: string): Promise<QuizAttempt> => {
    try {
      const response = await axios.post(
        `${API_URL}/study/attempts/${attemptId}/complete`
      )
      return response.data.data
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to complete quiz attempt'
      setError(message)
      throw new Error(message)
    }
  }

  const getAttempt = async (attemptId: string): Promise<QuizAttempt> => {
    try {
      const response = await axios.get(`${API_URL}/study/attempts/${attemptId}`)
      return response.data.data
    } catch (err) {
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
