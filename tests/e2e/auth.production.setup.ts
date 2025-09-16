import { test as setup } from '@playwright/test'
import { E2E_TEST_USER } from './utils/test-user'

const authFile = 'tests/e2e/.auth/production-user.json'

setup('production authenticate', async ({ page }) => {
  console.log('🔐 Starting production UI authentication setup...')

  try {
    // 本番環境にアクセス
    const baseURL =
      process.env.PLAYWRIGHT_BASE_URL || 'https://school-timetable-monorepo.grundhunter.workers.dev'
    await page.goto(baseURL)
    await page.waitForLoadState('networkidle')

    // 既存のローカルストレージをクリア
    await page.evaluate(() => localStorage.clear())

    // まずユーザー登録を試行（既に存在する場合はエラーになるが続行）
    console.log('👤 Attempting to register test user...')
    try {
      const response = await page.evaluate(async () => {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'test@school.local',
            password: 'password123',
            name: 'テストユーザー1',
          })
        })
        const text = await res.text()
        return { status: res.status, body: text, ok: res.ok }
      })
      
      if (response.ok) {
        console.log('✅ User registration successful')
      } else {
        console.log('⚠️ User registration failed (may already exist):', response.body)
      }
    } catch (regError) {
      console.log('⚠️ Registration attempt failed:', regError)
    }

    // ログイン実行
    console.log('🔐 Attempting login...')
    const loginResponse = await page.evaluate(async () => {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@school.local',
          password: 'password123',
        })
      })
      const data = await res.json()
      return { status: res.status, data, ok: res.ok }
    })

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} - ${JSON.stringify(loginResponse.data)}`)
    }

    if (!loginResponse.data.success) {
      throw new Error(`Authentication failed: ${loginResponse.data.error}`)
    }

    const authData = loginResponse.data

    console.log('✅ API authentication successful')
    console.log('👤 User:', authData.user.name, `(${authData.user.role})`)
    console.log('🎫 Token received:', `${authData.token.substring(0, 20)}...`)

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
        sameSite: 'Lax',
      },
    ]

    const authState = {
      cookies,
      origins: [
        {
          origin: baseURL,
          localStorage: [
            {
              name: 'auth_token',
              value: authData.token,
            },
            {
              name: 'auth_session_id',
              value: authData.sessionId || 'production-session',
            },
            {
              name: 'auth_user',
              value: JSON.stringify(authData.user),
            },
            {
              name: 'auth_expires',
              value: authData.expiresAt,
            },
          ],
        },
      ],
    }

    // ファイルシステムに認証状態を保存
    const fs = await import('node:fs/promises')
    const path = await import('node:path')
    const authDir = path.dirname(authFile)

    try {
      await fs.mkdir(authDir, { recursive: true })
    } catch (_error) {
      // Directory already exists
    }

    await fs.writeFile(authFile, JSON.stringify(authState, null, 2))
    console.log(`💾 Production authentication state saved to: ${authFile}`)
  } catch (error) {
    console.error('❌ Production authentication setup failed:', error)
    throw error
  }
})
