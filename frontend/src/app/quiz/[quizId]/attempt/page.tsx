'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import TakeQuiz from '@/components/TakeQuiz/TakeQuizPage'

export default function QuizAttemptPage() {
  const params = useParams()
  const quizId = Array.isArray(params.quizId)
    ? params.quizId[0]
    : (params.quizId as string)

  console.log('QuizAttemptPage rendering with quizId:', quizId)

  // State to track if there's an error loading the page
  const [pageError, setPageError] = useState<string | null>(null)

  // Check if the page is truly ready to render after mounting
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('Page mounted on client side')

      // Check if study service is reachable
      fetch('http://localhost:8082/study/health')
        .then((response) => {
          if (!response.ok) {
            setPageError('Quiz study service is not responding correctly.')
          }
          return response.text()
        })
        .then((data) => {
          console.log('Study service health check:', data)
        })
        .catch((error) => {
          console.error('Study service health check failed:', error)
          setPageError(
            'Cannot connect to quiz study service. Please check if the service is running.'
          )
        })
    }
  }, [])

  // Diagnostic bar for debugging
  const DiagnosticBar = () => (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        background: '#f0f9ff',
        padding: '10px',
        borderBottom: '1px solid #0284c7',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        fontSize: '12px',
        fontFamily: 'monospace',
      }}
    >
      <div>
        <strong>URL:</strong>{' '}
        {typeof window !== 'undefined'
          ? window.location.pathname
          : 'Loading...'}
      </div>
      <div>
        <strong>Quiz ID:</strong> {quizId}
      </div>
      <div>
        <strong>Params:</strong> {JSON.stringify(params)}
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
        <a
          href="/test-api.js"
          target="_blank"
          style={{ color: 'blue', textDecoration: 'underline' }}
        >
          Run API Test
        </a>
        <a
          href="/manual-test.js"
          target="_blank"
          style={{ color: 'blue', textDecoration: 'underline' }}
        >
          Run Manual Test
        </a>
      </div>
      {pageError && (
        <div
          style={{
            marginTop: '5px',
            padding: '5px',
            background: '#fee2e2',
            color: '#b91c1c',
            borderRadius: '4px',
          }}
        >
          <strong>Error:</strong> {pageError}
        </div>
      )}
    </div>
  )

  return (
    <>
      <DiagnosticBar />
      <div style={{ marginTop: '80px' }}>
        {pageError ? (
          <div
            style={{
              padding: '20px',
              margin: '20px auto',
              maxWidth: '800px',
              background: 'white',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
              textAlign: 'center',
            }}
          >
            <h2 style={{ color: '#b91c1c', marginBottom: '15px' }}>
              Error Loading Quiz
            </h2>
            <p>{pageError}</p>
            <p style={{ marginTop: '15px' }}>Please try the following:</p>
            <ul
              style={{
                listStyle: 'none',
                padding: '0',
                margin: '10px 0',
                textAlign: 'left',
                display: 'inline-block',
              }}
            >
              <li style={{ margin: '5px 0' }}>
                • Check that all services are running correctly
              </li>
              <li style={{ margin: '5px 0' }}>
                • Try the "Run Manual Test" link to verify API connectivity
              </li>
              <li style={{ margin: '5px 0' }}>
                • Refresh the page and try again
              </li>
            </ul>
          </div>
        ) : (
          <TakeQuiz />
        )}
      </div>
    </>
  )
}
