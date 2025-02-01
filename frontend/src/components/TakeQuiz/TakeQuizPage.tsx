import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
  Paper,
  Alert,
} from '@mui/material'
import QuizQuestion from './QuizQuestion'
import QuizProgress from './QuizProgress'
import QuizSummary from './QuizSummary'
import { useQuizAttempt } from '../../hooks/useQuizAttempt'
import { Question, QuizAttempt } from '../../types/quiz'

const TakeQuizPage: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attempt, setAttempt] = useState<QuizAttempt | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { startAttempt, getQuestions, submitAnswer, completeAttempt } =
    useQuizAttempt()

  useEffect(() => {
    const initializeQuiz = async () => {
      if (!quizId) return
      try {
        // Start a new quiz attempt
        const newAttempt = await startAttempt(quizId, 10) // 10 questions per quiz
        setAttempt(newAttempt)

        // Fetch questions for this attempt
        const quizQuestions = await getQuestions(newAttempt.id)
        setQuestions(quizQuestions)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to start quiz'
        setError(message)
        console.error('Failed to start quiz:', error)
      }
    }

    initializeQuiz()
  }, [quizId, startAttempt, getQuestions])

  const handleAnswerSubmit = async (questionId: string, answer: string) => {
    if (!attempt) return

    try {
      setIsSubmitting(true)
      await submitAnswer(attempt.id, questionId, answer)
      setAnswers({ ...answers, [questionId]: answer })

      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit answer'
      setError(message)
      console.error('Failed to submit answer:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleQuizComplete = async () => {
    if (!attempt) return

    try {
      setIsSubmitting(true)
      const completedAttempt = await completeAttempt(attempt.id)
      // Navigate to results page
      navigate(`/quiz/${quizId}/results/${completedAttempt.id}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to complete quiz'
      setError(message)
      console.error('Failed to complete quiz:', error)
    } finally {
      setIsSubmitting(false)
    }
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

  if (!attempt || questions.length === 0) {
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

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <Container maxWidth="md">
      <Box py={4}>
        <Paper elevation={3}>
          <Box p={4}>
            <QuizProgress
              currentQuestion={currentQuestionIndex + 1}
              totalQuestions={questions.length}
            />

            <Box my={4}>
              <QuizQuestion
                question={currentQuestion}
                onSubmit={handleAnswerSubmit}
                isSubmitting={isSubmitting}
              />
            </Box>

            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button
                variant="outlined"
                disabled={currentQuestionIndex === 0}
                onClick={() =>
                  setCurrentQuestionIndex(currentQuestionIndex - 1)
                }
              >
                Previous
              </Button>

              {isLastQuestion ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleQuizComplete}
                  disabled={isSubmitting}
                >
                  Complete Quiz
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  disabled={!answers[currentQuestion.id] || isSubmitting}
                  onClick={() =>
                    setCurrentQuestionIndex(currentQuestionIndex + 1)
                  }
                >
                  Next Question
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  )
}

export default TakeQuizPage
