'use client'

import React, { useState, useEffect } from 'react'
import { API_BASE_URL } from '@/config/constants'

export default function TestPage() {
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<any>({})
  const [error, setError] = useState<string | null>(null)

  // Test quiz ID
  const quizId = '328f6511-0308-49cb-a804-9b0fa81d1284'

  useEffect(() => {
    const runTests = async () => {
      const testResults: Record<string, any> = {
        constants: {
          API_BASE_URL,
        },
        apiTests: {},
      }

      try {
        // Test 1: Simple GET request to check connectivity
        try {
          const response = await fetch(`${API_BASE_URL}/health`)
          testResults.apiTests.health = {
            status: response.status,
            ok: response.ok,
            text: await response.text(),
          }
        } catch (error: any) {
          testResults.apiTests.health = {
            error: error.message,
          }
        }

        // Test 2: Create a quiz attempt
        try {
          const response = await fetch(`${API_BASE_URL}/study/attempts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              userId: '00000000-0000-0000-0000-000000000001',
              quizId: quizId,
              totalQuestions: 1,
            }),
          })

          const responseText = await response.text()
          testResults.apiTests.createAttempt = {
            status: response.status,
            ok: response.ok,
            text: responseText,
          }

          try {
            const json = JSON.parse(responseText)
            testResults.apiTests.createAttempt.json = json

            // If successful, also try to fetch questions
            if (response.ok && json && (json.data?.id || json.id)) {
              const attemptId = json.data?.id || json.id

              const questionsResponse = await fetch(
                `${API_BASE_URL}/study/attempts/${attemptId}/questions`
              )
              const questionsText = await questionsResponse.text()

              testResults.apiTests.getQuestions = {
                status: questionsResponse.status,
                ok: questionsResponse.ok,
                text: questionsText,
              }

              try {
                const questionsJson = JSON.parse(questionsText)
                testResults.apiTests.getQuestions.json = questionsJson
              } catch (e) {
                // ignore JSON parse errors
              }
            }
          } catch (e) {
            // ignore JSON parse errors
          }
        } catch (error: any) {
          testResults.apiTests.createAttempt = {
            error: error.message,
          }
        }

        setResults(testResults)
      } catch (err: any) {
        setError(err.message || 'An unknown error occurred')
      } finally {
        setLoading(false)
      }
    }

    runTests()
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold">API Test Page</h1>
        <p>Loading... Running API tests</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <h1 className="mb-4 text-2xl font-bold">API Test Page</h1>
        <div className="rounded border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          <p>
            <strong>Error:</strong> {error}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">API Test Page</h1>

      <div className="mb-6">
        <h2 className="mb-2 text-xl font-bold">Constants</h2>
        <pre className="overflow-auto rounded bg-gray-100 p-4">
          {JSON.stringify(results.constants, null, 2)}
        </pre>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-xl font-bold">API Tests</h2>
        {Object.entries(results.apiTests).map(([testName, testResult]) => (
          <div key={testName} className="mb-4">
            <h3 className="text-lg font-semibold">{testName}</h3>
            <pre className="overflow-auto rounded bg-gray-100 p-4">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  )
}
