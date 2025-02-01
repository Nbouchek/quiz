import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { Container, Box, CircularProgress, Alert } from '@mui/material'
import QuizSummary from './QuizSummary'
import { useQuizAttempt } from '../../hooks/useQuizAttempt'
import { QuizAttempt } from '../../types/quiz'

const QuizResultsPage: React.FC = () => {
  const router = useRouter()
  const { quizId, attemptId } = router.query
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { getAttempt } = useQuizAttempt()

  useEffect(() => {
    const loadAttempt = async () => {
      if (!attemptId || typeof attemptId !== 'string') return
      try {
        const quizAttempt = await getAttempt(attemptId)
        setAttempt(quizAttempt)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to load quiz results'
        setError(message)
        console.error('Failed to load quiz results:', error)
      }
    }

    loadAttempt()
  }, [attemptId, getAttempt])

  const handleRetry = () => {
    if (quizId && typeof quizId === 'string') {
      router.push(`/quiz/${quizId}`)
    }
  }

  const handleBack = () => {
    router.push('/quizzes')
  }

  if (error) {
    return (
      <Container>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Box>
      </Container>
    )
  }

  if (!attempt) {
    return (
      <Container>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="60vh"
        >
          <CircularProgress />
        </Box>
      </Container>
    )
  }

  return (
    <Container maxWidth="md">
      <Box py={4}>
        <QuizSummary
          attempt={attempt}
          onRetry={handleRetry}
          onBack={handleBack}
        />
      </Box>
    </Container>
  )
}

export default QuizResultsPage
