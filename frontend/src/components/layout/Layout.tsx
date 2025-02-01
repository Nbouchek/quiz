'use client'

import { type ReactNode } from 'react'
import { Navbar } from './Navbar'
import { usePathname } from 'next/navigation'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname()
  const isHomePage = pathname === '/'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className={
            isHomePage ? '' : 'bg-white px-6 py-8 shadow sm:rounded-lg'
          }
        >
          {children}
        </div>
      </main>
    </div>
  )
}
