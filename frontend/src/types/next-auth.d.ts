// Type definitions for NextAuth
declare module 'next-auth' {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's id */
      id?: string
      /** The user's name */
      name?: string | null
      /** The user's email address */
      email?: string | null
      /** The user's profile image */
      image?: string | null
    }
  }

  interface User {
    id: string
    name?: string
    email?: string
    image?: string
  }
}

declare module 'next-auth/jwt' {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's id */
    id?: string
  }
}
