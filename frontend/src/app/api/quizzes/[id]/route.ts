import { NextResponse } from 'next/server'
import axios, { AxiosError } from 'axios'
import type { Question } from '@/types'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  if (!params.id) {
    return NextResponse.json({ error: 'Quiz ID is required' }, { status: 400 })
  }

  try {
    console.log('Fetching quiz with ID:', params.id)
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/content/quizzes/${params.id}`
    )

    // Log the raw response
    console.log('Raw API response:', JSON.stringify(response.data, null, 2))

    // Check if the response has the expected structure
    if (!response.data || !response.data.data) {
      console.error(
        'Invalid response format:',
        JSON.stringify(response.data, null, 2)
      )
      return NextResponse.json(
        { error: 'Invalid response format' },
        { status: 500 }
      )
    }

    // Log the processed quiz data
    console.log(
      'Processed quiz data:',
      JSON.stringify(response.data.data, null, 2)
    )
    console.log(
      'Quiz questions:',
      JSON.stringify(response.data.data.questions, null, 2)
    )

    // Validate question structure
    const quiz = response.data.data
    if (Array.isArray(quiz.questions)) {
      quiz.questions.forEach((question: Question, index: number) => {
        if (typeof question === 'object' && question !== null) {
          console.log(
            `Question ${index + 1} structure:`,
            JSON.stringify(question, null, 2)
          )
        } else {
          console.error(`Invalid question at index ${index}:`, question)
        }
      })
    } else {
      console.error('Questions is not an array:', quiz.questions)
    }

    return NextResponse.json(response.data)
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error(
        'Error fetching quiz:',
        error.response?.data || error.message
      )

      // Handle 404 specifically
      if (error.response?.status === 404) {
        return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
      }

      return NextResponse.json(
        { error: error.response?.data?.message || 'Failed to fetch quiz' },
        { status: error.response?.status || 500 }
      )
    }

    // Handle non-Axios errors
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
