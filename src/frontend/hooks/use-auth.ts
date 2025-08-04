import { useClerk, useAuth as useClerkAuth, useUser } from '@clerk/clerk-react'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AuthUser {
  sub: string
  email: string
  name: string
  picture?: string
  roles: string[]
  permissions: string[]
}

export function useAuth() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useClerkAuth()
  const { signOut } = useClerk()

  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const tokenRef = useRef<string | null>(null)

  // Fresh token getter with automatic refresh
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    if (!isSignedIn || !user) {
      return null
    }

    try {
      const freshToken = await getToken()
      if (freshToken) {
        setToken(freshToken)
        tokenRef.current = freshToken
      }
      return freshToken
    } catch (error) {
      console.error('Failed to get fresh token:', error)
      return null
    }
  }, [isSignedIn, user, getToken])

  useEffect(() => {
    const loadUserData = async () => {
      if (isSignedIn && user) {
        try {
          const _accessToken = await getFreshToken()

          // Get roles from Clerk metadata or default to school_admin
          const clerkRoles = (user.publicMetadata?.roles as string[]) || ['school_admin']

          const userInfo: AuthUser = {
            sub: user.id,
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.fullName || user.firstName || '',
            picture: user.imageUrl,
            roles: clerkRoles,
            permissions: [
              'schools:read',
              'schools:write',
              'classes:read',
              'classes:write',
              'teachers:read',
              'teachers:write',
              'subjects:read',
              'subjects:write',
              'classrooms:read',
              'classrooms:write',
              'timetables:read',
              'timetables:write',
              'timetables:generate',
              'constraints:read',
              'constraints:write',
              'users:read',
              'users:write',
            ],
          }

          setAuthUser(userInfo)

          console.log('Auth user loaded:', {
            roles: clerkRoles,
            permissions: userInfo.permissions.slice(0, 3),
          })
        } catch (error) {
          console.error('Failed to load user data:', error)
        }
      } else {
        setToken(null)
        tokenRef.current = null
        setAuthUser(null)
      }
    }

    loadUserData()
  }, [isSignedIn, user, getFreshToken])

  const login = () => {
    window.location.href = '/sign-in'
  }

  const logout = async () => {
    try {
      await signOut({ redirectUrl: '/' })
    } catch (error) {
      console.error('ログアウトに失敗しました:', error)
      window.location.href = '/'
    }
  }

  return {
    isAuthenticated: isSignedIn,
    isLoading: !isLoaded,
    user: authUser,
    token,
    getFreshToken,
    login,
    logout,
  }
}
