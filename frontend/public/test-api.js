// API Test Script
// This script can be run in the browser console to manually test the quiz attempt API

const testQuizAttemptAPI = async () => {
  const quizId = '61a0ca8d-14bc-40d8-a6a2-41a2c71035bd'
  const apiBaseUrl = 'http://localhost:8082'
  const studyApiUrl = `${apiBaseUrl}/study`

  console.log('Starting API test with quiz ID:', quizId)
  console.log('API URLs:', { apiBaseUrl, studyApiUrl })

  try {
    // Step 1: Create a quiz attempt
    console.log('Step 1: Creating quiz attempt...')
    const createResponse = await fetch(`${studyApiUrl}/attempts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        quizId: quizId,
        totalQuestions: 3,
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      console.error('Failed to create attempt:', errorText)
      throw new Error(`Failed to create attempt: ${createResponse.status}`)
    }

    const attemptData = await createResponse.json()
    console.log('Quiz attempt created:', attemptData)

    if (!attemptData.success || !attemptData.data) {
      throw new Error('Invalid response format')
    }

    const attempt = attemptData.data

    // Step 2: Get questions for the attempt
    console.log('Step 2: Getting questions...')
    const questionsResponse = await fetch(
      `${studyApiUrl}/attempts/${attempt.id}/questions`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!questionsResponse.ok) {
      const errorText = await questionsResponse.text()
      console.error('Failed to get questions:', errorText)
      throw new Error(`Failed to get questions: ${questionsResponse.status}`)
    }

    const questionsData = await questionsResponse.json()
    console.log('Questions retrieved:', questionsData)

    if (!questionsData.success || !Array.isArray(questionsData.data)) {
      throw new Error('Invalid questions response format')
    }

    const questions = questionsData.data
    if (questions.length === 0) {
      throw new Error('No questions found for this quiz')
    }

    // Step 3: Submit an answer
    const firstQuestion = questions[0]
    console.log('Step 3: Submitting answer for question:', firstQuestion)

    const answerResponse = await fetch(
      `${studyApiUrl}/attempts/${attempt.id}/answers`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId: firstQuestion.id,
          answer: firstQuestion.options[0], // Choose first option
          isCorrect: true,
        }),
      }
    )

    if (!answerResponse.ok) {
      const errorText = await answerResponse.text()
      console.error('Failed to submit answer:', errorText)
      throw new Error(`Failed to submit answer: ${answerResponse.status}`)
    }

    const answerData = await answerResponse.json()
    console.log('Answer submitted:', answerData)

    // Step 4: Complete the attempt
    console.log('Step 4: Completing attempt...')
    const completeResponse = await fetch(
      `${studyApiUrl}/attempts/${attempt.id}/complete`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text()
      console.error('Failed to complete attempt:', errorText)
      throw new Error(`Failed to complete attempt: ${completeResponse.status}`)
    }

    const completeData = await completeResponse.json()
    console.log('Attempt completed:', completeData)

    console.log('API test completed successfully!')
    return {
      success: true,
      attempt,
      questions,
      completedAttempt: completeData.data,
    }
  } catch (error) {
    console.error('API test failed:', error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// Run the test function
testQuizAttemptAPI().then((result) => {
  console.log('Test result:', result)
  if (typeof window !== 'undefined') {
    window.testResult = result
  }
})
