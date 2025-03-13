import { render, screen, waitFor } from '@testing-library/react'
import { useSession, signOut } from 'next-auth/react'
import { SessionProvider } from 'next-auth/react'
import { Navbar } from '@/components/layout/Navbar'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

// Mock next-auth
jest.mock('next-auth/react', () => {
  const originalModule = jest.requireActual('next-auth/react')
  return {
    __esModule: true,
    ...originalModule,
    useSession: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
  }
})

describe('Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('shows login button when not authenticated', () => {
    // Mock unauthenticated session
    ;(useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    })

    render(
      <SessionProvider session={null}>
        <Navbar />
      </SessionProvider>
    )

    expect(screen.getByText('Sign in')).toBeInTheDocument()
    expect(screen.queryByText('Sign out')).not.toBeInTheDocument()
  })

  it('shows user info and logout button when authenticated', () => {
    // Mock authenticated session
    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
      expires: new Date(Date.now() + 10000).toISOString(),
    }

    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(
      <SessionProvider session={mockSession}>
        <Navbar />
      </SessionProvider>
    )

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('Sign out')).toBeInTheDocument()
    expect(screen.queryByText('Sign in')).not.toBeInTheDocument()
  })

  it('calls signOut when logout button is clicked', async () => {
    // Mock authenticated session
    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
      expires: new Date(Date.now() + 10000).toISOString(),
    }

    ;(useSession as jest.Mock).mockReturnValue({
      data: mockSession,
      status: 'authenticated',
    })

    render(
      <SessionProvider session={mockSession}>
        <Navbar />
      </SessionProvider>
    )

    // Find and click the sign out button
    const signOutButton = screen.getByText('Sign out')
    signOutButton.click()

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith({ callbackUrl: '/' })
    })
  })
})
