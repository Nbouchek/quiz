// Simple Quiz Attempt API test script
// You can run this in your browser console at http://localhost:3000/manual-test.js

;(async function testQuizAttemptAPI() {
  console.log('Starting API test - Manual Quiz Attempt Test')

  const quizId = '61a0ca8d-14bc-40d8-a6a2-41a2c71035bd'
  const studyApiUrl = 'http://localhost:8082/study'

  console.log('Using quiz ID:', quizId)
  console.log('API URL:', studyApiUrl)

  // Function to log requests with colors for better visibility
  const log = {
    info: (msg) => console.log(`%c${msg}`, 'color: blue; font-weight: bold'),
    success: (msg) =>
      console.log(`%c${msg}`, 'color: green; font-weight: bold'),
    error: (msg) => console.log(`%c${msg}`, 'color: red; font-weight: bold'),
    data: (label, data) => {
      console.log(`%c${label}:`, 'color: purple; font-weight: bold')
      console.log(data)
    },
  }

  // Test CORS with a simple fetch health check first
  log.info('Testing API connectivity with health check...')
  try {
    const healthResponse = await fetch(`${studyApiUrl}/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (healthResponse.ok) {
      log.success(`Health check successful: ${healthResponse.status}`)
    } else {
      log.error(`Health check failed: ${healthResponse.status}`)
    }
  } catch (error) {
    log.error('Health check failed with exception:')
    console.error(error)
  }

  // 1. Create a quiz attempt
  log.info('Step 1: Creating a quiz attempt...')
  try {
    const createResponse = await fetch(`${studyApiUrl}/attempts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: '00000000-0000-0000-0000-000000000001',
        quizId: quizId,
        totalQuestions: 3,
      }),
    })

    if (!createResponse.ok) {
      const errorText = await createResponse.text()
      log.error(`Failed to create attempt: ${createResponse.status}`)
      log.data('Error details', errorText)
      return
    }

    const attemptData = await createResponse.json()
    log.success('Quiz attempt created successfully')
    log.data('Attempt data', attemptData)

    if (!attemptData.success || !attemptData.data) {
      log.error('Invalid response format')
      return
    }

    const attempt = attemptData.data

    // 2. Get questions for the attempt
    log.info('Step 2: Getting questions...')
    const questionsResponse = await fetch(
      `${studyApiUrl}/attempts/${attempt.id}/questions`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    if (!questionsResponse.ok) {
      const errorText = await questionsResponse.text()
      log.error(`Failed to get questions: ${questionsResponse.status}`)
      log.data('Error details', errorText)
      return
    }

    const questionsData = await questionsResponse.json()
    log.success('Questions retrieved successfully')
    log.data('Questions data', questionsData)

    if (!questionsData.success || !Array.isArray(questionsData.data)) {
      log.error('Invalid questions response format')
      return
    }

    const questions = questionsData.data
    if (questions.length === 0) {
      log.error('No questions found for this quiz')
      return
    }

    // 3. Submit an answer
    const firstQuestion = questions[0]
    log.info('Step 3: Submitting answer for question')
    log.data('Question', firstQuestion)

    const answerResponse = await fetch(
      `${studyApiUrl}/attempts/${attempt.id}/answers`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: firstQuestion.id,
          answer: firstQuestion.options[0], // Choose first option
          isCorrect: true,
        }),
      }
    )

    if (!answerResponse.ok) {
      const errorText = await answerResponse.text()
      log.error(`Failed to submit answer: ${answerResponse.status}`)
      log.data('Error details', errorText)
      return
    }

    const answerData = await answerResponse.json()
    log.success('Answer submitted successfully')
    log.data('Answer data', answerData)

    // 4. Complete the attempt
    log.info('Step 4: Completing attempt...')
    const completeResponse = await fetch(
      `${studyApiUrl}/attempts/${attempt.id}/complete`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }
    )

    if (!completeResponse.ok) {
      const errorText = await completeResponse.text()
      log.error(`Failed to complete attempt: ${completeResponse.status}`)
      log.data('Error details', errorText)
      return
    }

    const completeData = await completeResponse.json()
    log.success('Attempt completed successfully')
    log.data('Complete data', completeData)

    log.info('Test completed successfully')
    return {
      success: true,
      attempt,
      questions,
      completedAttempt: completeData.data,
    }
  } catch (error) {
    log.error('Test failed with exception:')
    console.error(error)
    return {
      success: false,
      error: error.message,
    }
  }
})()
