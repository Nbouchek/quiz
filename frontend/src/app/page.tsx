'use client'

import Link from 'next/link'
import { PlusIcon, ClockIcon, FireIcon } from '@heroicons/react/24/outline'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero section */}
      <div className="px-6 py-32 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Create and Share Amazing Quizzes
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600">
          Test your knowledge, challenge your friends, and learn something new
          with our interactive quiz platform.
        </p>
        <div className="mt-16 flex flex-col items-center justify-center gap-8 sm:flex-row">
          <Link
            href="/create"
            className="inline-flex items-center justify-center rounded-xl bg-green-500 px-16 py-8 text-4xl font-black text-white shadow-[0_4px_12px_rgba(34,197,94,0.5)] ring-1 ring-green-600 transition-all duration-300 hover:-translate-y-1 hover:scale-105 hover:bg-green-400 hover:shadow-[0_8px_30px_rgba(34,197,94,0.6)] active:scale-95"
          >
            <PlusIcon className="mr-4 h-12 w-12" aria-hidden="true" />
            Create a Quiz
          </Link>
          <Link
            href="/explore"
            className="text-2xl font-bold text-gray-900 no-underline transition-colors duration-200 hover:text-green-600"
          >
            Explore Quizzes <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Features section */}
      <div className="mx-auto mt-16 max-w-7xl px-6 sm:mt-20 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-base font-semibold leading-7 text-green-600">
            Everything you need
          </h2>
          <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Create, Share, Learn
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <PlusIcon
                  className="h-5 w-5 flex-none text-green-600"
                  aria-hidden="true"
                />
                Create Custom Quizzes
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Design your own quizzes with multiple question types, images,
                  and custom scoring.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <ClockIcon
                  className="h-5 w-5 flex-none text-green-600"
                  aria-hidden="true"
                />
                Track Progress
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Monitor your learning progress and see how you improve over
                  time.
                </p>
              </dd>
            </div>
            <div className="flex flex-col">
              <dt className="flex items-center gap-x-3 text-base font-semibold leading-7 text-gray-900">
                <FireIcon
                  className="h-5 w-5 flex-none text-green-600"
                  aria-hidden="true"
                />
                Compete & Learn
              </dt>
              <dd className="mt-4 flex flex-auto flex-col text-base leading-7 text-gray-600">
                <p className="flex-auto">
                  Challenge friends and compete on the leaderboard while
                  learning.
                </p>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Featured quizzes section */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold tracking-tight text-gray-900">
          Featured Quizzes
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="group relative rounded-lg border bg-white p-6 hover:shadow-md">
            <h3 className="text-lg font-semibold leading-7 text-gray-900">
              <Link href="/content/quizzes/1" className="focus:outline-none">
                <span className="absolute inset-0" aria-hidden="true" />
                JavaScript Fundamentals
              </Link>
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Test your knowledge of JavaScript basics.
            </p>
            <div className="mt-4 flex items-center gap-x-2 text-sm text-gray-500">
              <span>10 questions</span>
              <span>•</span>
              <span>5 min</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
