import React, { useState } from 'react'
import {
  Box,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Button,
  Paper,
} from '@mui/material'
import { Question } from '../../types/quiz'

interface QuizQuestionProps {
  question: Question
  onSubmit: (questionId: string, answer: string) => void
  isSubmitting: boolean
}

const QuizQuestion: React.FC<QuizQuestionProps> = ({
  question,
  onSubmit,
  isSubmitting,
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState('')

  const handleSubmit = () => {
    if (selectedAnswer) {
      onSubmit(question.id, selectedAnswer)
      setSelectedAnswer('')
    }
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        {question.text}
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, my: 2 }}>
        <RadioGroup
          value={selectedAnswer}
          onChange={(e) => setSelectedAnswer(e.target.value)}
        >
          {question.options.map((option: string, index: number) => (
            <FormControlLabel
              key={index}
              value={option}
              control={<Radio />}
              label={
                <Typography variant="body1" sx={{ py: 1 }}>
                  {option}
                </Typography>
              }
              disabled={isSubmitting}
            />
          ))}
        </RadioGroup>
      </Paper>

      <Box display="flex" justifyContent="flex-end" mt={2}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={!selectedAnswer || isSubmitting}
        >
          Submit Answer
        </Button>
      </Box>
    </Box>
  )
}

export default QuizQuestion
