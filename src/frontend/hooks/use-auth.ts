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
      console.log('❌ getFreshToken: ユーザーが認証されていません')
      return null
    }

    try {
      console.log('🔄 Clerkから新しいトークンを取得中...')
      const freshToken = await getToken()
      if (freshToken) {
        console.log('✅ 新しいトークン取得成功')
        setToken(freshToken)
        tokenRef.current = freshToken
        return freshToken
      } else {
        console.log('❌ Clerkからトークンが取得できませんでした')
        return null
      }
    } catch (error) {
      console.error('❌ トークン取得エラー:', error)
      return null
    }
  }, [isSignedIn, user, getToken])

  useEffect(() => {
    const loadUserData = async () => {
      if (isSignedIn && user) {
        try {
          // 初期トークン取得
          const accessToken = await getFreshToken()
          console.log('🔑 初期トークン取得:', accessToken ? 'Success' : 'Failed')

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
          // トークン取得失敗時はトークンをクリア
          setToken(null)
          tokenRef.current = null
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
