import React from 'react'
import { Box, LinearProgress, Typography } from '@mui/material'

interface QuizProgressProps {
  currentQuestion: number
  totalQuestions: number
}

const QuizProgress: React.FC<QuizProgressProps> = ({
  currentQuestion,
  totalQuestions,
}) => {
  const progress = (currentQuestion / totalQuestions) * 100

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" mb={1}>
        <Typography variant="body2" color="textSecondary">
          Question {currentQuestion} of {totalQuestions}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          {Math.round(progress)}% Complete
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
          },
        }}
      />
    </Box>
  )
}

export default QuizProgress
