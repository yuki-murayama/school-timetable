import { test as setup } from '@playwright/test'
import { E2E_TEST_USER } from './utils/test-user'

const authFile = 'tests/e2e/.auth/production-user.json'

setup('production authenticate', async ({ request }) => {
  console.log('🔐 Starting production API authentication setup...')
  
  try {
    // 本番環境のAPIエンドポイントに直接認証リクエスト
    const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://school-timetable-monorepo.grundhunter.workers.dev'
    const loginResponse = await request.post(`${baseURL}/api/auth/login`, {
      data: {
        email: E2E_TEST_USER.email,
        password: E2E_TEST_USER.password
      }
    })
    
    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text()
      throw new Error(`Login failed: ${loginResponse.status()} - ${errorText}`)
    }
    
    const authData = await loginResponse.json()
    
    if (!authData.success) {
      throw new Error(`Authentication failed: ${authData.error}`)
    }
    
    console.log('✅ API authentication successful')
    console.log('👤 User:', authData.user.name, `(${authData.user.role})`)
    console.log('🎫 Token received:', authData.token.substring(0, 20) + '...')
    
    // 認証情報を保存（ブラウザでの使用は想定しないがcookieとして保存）
    const cookies = [
      {
        name: 'auth_token',
        value: authData.token,
        domain: '.grundhunter.workers.dev',
        path: '/',
        expires: new Date(authData.expiresAt).getTime() / 1000,
        httpOnly: false,
        secure: true,
        sameSite: 'Lax'
      }
    ]
    
    const authState = {
      cookies,
      origins: [
        {
          origin: baseURL,
          localStorage: [
            {
              name: 'auth_token',
              value: authData.token
            },
            {
              name: 'auth_session_id',
              value: authData.sessionId || 'production-session'
            },
            {
              name: 'auth_user',
              value: JSON.stringify(authData.user)
            },
            {
              name: 'auth_expires',
              value: authData.expiresAt
            }
          ]
        }
      ]
    }
    
    // ファイルシステムに認証状態を保存
    const fs = await import('fs/promises')
    const path = await import('path')
    const authDir = path.dirname(authFile)
    
    try {
      await fs.mkdir(authDir, { recursive: true })
    } catch (error) {
      // Directory already exists
    }
    
    await fs.writeFile(authFile, JSON.stringify(authState, null, 2))
    console.log(`💾 Production authentication state saved to: ${authFile}`)
    
  } catch (error) {
    console.error('❌ Production authentication setup failed:', error)
    throw error
  }
})