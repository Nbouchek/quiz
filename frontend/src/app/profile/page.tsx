'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { UserCircleIcon } from '@heroicons/react/24/solid'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      setIsLoading(false)
    }
  }, [status, router])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-700">
            Loading profile...
          </h2>
        </div>
      </div>
    )
  }

  // Access user ID with type assertion to work around the type limitations
  const userId = session?.user ? (session.user as any).id : undefined

  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">Your Profile</h1>

      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-6 sm:px-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {session?.user?.image ? (
                <img
                  className="h-24 w-24 rounded-full"
                  src={session.user.image}
                  alt={session.user.name || "User's profile"}
                />
              ) : (
                <UserCircleIcon
                  className="h-24 w-24 text-primary-400"
                  aria-hidden="true"
                />
              )}
            </div>
            <div className="ml-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {session?.user?.name || 'User'}
              </h2>
              <p className="text-sm text-gray-500">{session?.user?.email}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Full name</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {session?.user?.name || 'Not provided'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Email address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {session?.user?.email || 'Not provided'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {userId || 'Not available'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">
                Authentication method
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {session?.user?.image ? 'Social login' : 'Email and password'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mr-4 rounded-md bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          Back to Home
        </button>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="rounded-md bg-primary-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
        >
          Update Profile
        </button>
      </div>
    </div>
  )
}
