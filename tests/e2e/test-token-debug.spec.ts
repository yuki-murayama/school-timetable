import { test, expect } from '@playwright/test'

test.use({ storageState: 'tests/e2e/.auth/user.json' })

test('Production Token Debug Test', async ({ page }) => {
  console.log('🔍 Starting token debug test...')
  
  // Navigate to the local app
  await page.goto('http://localhost:5174/')
  
  // Wait for app to load
  await page.waitForTimeout(2000)
  
  // Check localStorage tokens
  const localStorageTokens = await page.evaluate(() => {
    return {
      auth_token: localStorage.getItem('auth_token'),
      auth_session_id: localStorage.getItem('auth_session_id'),
      auth_user: localStorage.getItem('auth_user'),
      auth_expires: localStorage.getItem('auth_expires'),
      all_keys: Object.keys(localStorage)
    }
  })
  
  console.log('📱 LocalStorage tokens:', {
    auth_token_prefix: localStorageTokens.auth_token?.substring(0, 30) + '...',
    auth_session_id: localStorageTokens.auth_session_id,
    auth_user: localStorageTokens.auth_user ? 'exists' : 'missing',
    auth_expires: localStorageTokens.auth_expires,
    all_keys: localStorageTokens.all_keys
  })
  
  // Check if tokens are present
  expect(localStorageTokens.auth_token).toBeTruthy()
  expect(localStorageTokens.auth_session_id).toBeTruthy()
  
  // Test direct API call from browser context
  const apiResponse = await page.evaluate(async (tokenData) => {
    try {
      const response = await fetch('/api/school/settings', {
        headers: {
          'Authorization': `Bearer ${tokenData.token}`,
          'Content-Type': 'application/json'
        }
      })
      
      return {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: response.ok ? await response.json() : await response.text()
      }
    } catch (error) {
      return {
        error: error.message,
        stack: error.stack
      }
    }
  }, { token: localStorageTokens.auth_token })
  
  console.log('🌐 Direct API call result:', {
    status: apiResponse.status,
    ok: apiResponse.ok,
    statusText: apiResponse.statusText,
    body_preview: typeof apiResponse.body === 'string' ? 
      apiResponse.body.substring(0, 200) + '...' :
      JSON.stringify(apiResponse.body).substring(0, 200) + '...'
  })
  
  // Check network requests
  const networkLogs: string[] = []
  page.on('response', response => {
    if (response.url().includes('/api/')) {
      networkLogs.push(`${response.status()} ${response.url()}`)
    }
  })
  
  // Wait for any pending requests
  await page.waitForTimeout(3000)
  
  console.log('📡 Network requests observed:', networkLogs)
})