import React from 'react'
import { Box, Typography, Paper, Button, CircularProgress } from '@mui/material'
import { QuizAttempt } from '../../types/quiz'

interface QuizSummaryProps {
  attempt: QuizAttempt
  onRetry?: () => void
  onBack: () => void
}

const QuizSummary: React.FC<QuizSummaryProps> = ({
  attempt,
  onRetry,
  onBack,
}) => {
  const percentage = Math.round(
    (attempt.correctAnswers / attempt.totalQuestions) * 100
  )
  const isPerfect = percentage === 100
  const isPassing = percentage >= 70

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom>
          Quiz Results
        </Typography>

        <Box position="relative" display="inline-flex" my={4}>
          <CircularProgress
            variant="determinate"
            value={percentage}
            size={120}
            thickness={4}
            sx={{
              color: isPerfect
                ? 'success.main'
                : isPassing
                  ? 'primary.main'
                  : 'error.main',
            }}
          />
          <Box
            position="absolute"
            display="flex"
            alignItems="center"
            justifyContent="center"
            top={0}
            left={0}
            bottom={0}
            right={0}
          >
            <Typography variant="h4" component="div" color="text.secondary">
              {percentage}%
            </Typography>
          </Box>
        </Box>

        <Typography
          variant="h5"
          gutterBottom
          color={
            isPerfect
              ? 'success.main'
              : isPassing
                ? 'primary.main'
                : 'error.main'
          }
        >
          {isPerfect
            ? 'Perfect Score!'
            : isPassing
              ? 'Congratulations!'
              : 'Keep Practicing!'}
        </Typography>

        <Typography variant="body1" color="text.secondary" paragraph>
          You got {attempt.correctAnswers} out of {attempt.totalQuestions}{' '}
          questions correct.
        </Typography>

        <Box mt={4} display="flex" justifyContent="center" gap={2}>
          {onRetry && (
            <Button variant="contained" color="primary" onClick={onRetry}>
              Try Again
            </Button>
          )}
          <Button variant="outlined" onClick={onBack}>
            Back to Quizzes
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default QuizSummary
