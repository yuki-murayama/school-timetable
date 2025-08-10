/**
 * 共通APIクライアント設定
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface ApiOptions {
  token?: string
  getFreshToken?: () => Promise<string | null>
}

const createHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // CSRF保護
    'X-CSRF-Token': generateCSRFToken(), // CSRF保護トークン
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

// 簡易的なCSRFトークン生成（実際の実装では、サーバーから取得することが推奨）
function generateCSRFToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

// Helper function to handle API requests with automatic token refresh
const makeApiRequest = async (
  url: string,
  options: RequestInit,
  apiOptions?: ApiOptions
): Promise<Response> => {
  // Pre-emptive token refresh check for expired tokens
  let currentToken = apiOptions?.token
  if (currentToken && apiOptions?.getFreshToken) {
    try {
      // Check if token is expired by attempting to decode JWT
      const tokenParts = currentToken.split('.')
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]))
        const currentTime = Date.now() / 1000

        // If token expires within next 5 minutes, refresh proactively (reduced frequency)
        if (payload.exp && payload.exp - currentTime < 300) {
          console.log('🔄 トークンが間もなく期限切れ、事前更新中... (期限:', new Date(payload.exp * 1000).toISOString(), ')')
          const freshToken = await apiOptions.getFreshToken()
          if (freshToken) {
            console.log('✅ 事前トークン更新成功')
            currentToken = freshToken
            // Update headers with fresh token
            options.headers = {
              ...options.headers,
              ...createHeaders(freshToken),
            }
          }
        }
      }
    } catch (preCheckError) {
      // If pre-check fails, continue with original token
      console.log('ℹ️ トークン事前チェックスキップ:', preCheckError.message)
    }
  }

  let response = await fetch(url, options)

  // If we get a 401 and have a token refresh function, try to refresh and retry
  if (response.status === 401 && apiOptions?.getFreshToken) {
    console.log('🔄 401エラー検出、トークン更新を試行中...')
    try {
      let freshToken = await apiOptions.getFreshToken()
      if (freshToken) {
        console.log('✅ トークン更新成功、リクエスト再試行中...')

        // Retry with maximum 2 attempts to prevent infinite loops
        let retryCount = 0
        const maxRetries = 2

        while (retryCount < maxRetries) {
          // Update headers with fresh token
          const newHeaders = {
            ...options.headers,
            ...createHeaders(freshToken),
          }
          response = await fetch(url, { ...options, headers: newHeaders })
          console.log(`🔄 再試行 ${retryCount + 1}: ${response.status}`)

          if (response.status !== 401) {
            // Success or non-auth error, break retry loop
            break
          }

          retryCount++
          if (retryCount < maxRetries) {
            console.log('⚠️ 再試行後も401、追加のトークン更新を試行...')
            // Wait a bit before retry to avoid race conditions
            await new Promise(resolve => setTimeout(resolve, 100))

            // Try to get another fresh token
            const newerToken = await apiOptions.getFreshToken()
            if (!newerToken) {
              console.error('❌ 追加トークン取得失敗')
              break
            }
            console.log('🔄 新しいトークンで再度試行中...')
            // Use the newer token for next retry
            freshToken = newerToken
          }
        }

        // If still 401 after all retries, the authentication is fundamentally broken
        if (response.status === 401) {
          console.error('⚠️ 全再試行後も401エラー、認証システムに問題があります')
          throw new Error('認証に失敗しました。ページを再読み込みして再度ログインしてください。')
        }
      } else {
        console.error('❌ トークン更新失敗: 新しいトークンが取得できませんでした')
        throw new Error('認証トークンの更新に失敗しました。再度ログインしてください。')
      }
    } catch (refreshError) {
      console.error('❌ トークン更新処理でエラー:', refreshError)
      // Re-throw the error but don't wrap it again if it's already a proper error message
      if (refreshError instanceof Error && refreshError.message.includes('認証')) {
        throw refreshError
      }
      throw new Error(`認証エラー: ${refreshError.message || '不明なエラー'}`)
    }
  }

  return response
}

export const apiClient = {
  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    // Making GET request to: ${API_BASE_URL}${endpoint}
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        headers: createHeaders(options?.token),
      },
      options
    )

    // Response status: response.status
    // Response headers: Object.fromEntries(response.headers.entries())

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // Response data: responseData
    // Response data type: typeof responseData
    // Is array?: Array.isArray(responseData)

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured response
      // Success: responseData.success
      // Data: responseData.data
      // Data type: typeof responseData.data
      // Data is array?: Array.isArray(responseData.data)

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },

  async post<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T> {
    // Making POST request to: ${API_BASE_URL}${endpoint}
    // Request data: JSON.stringify(data, null, 2)
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'POST',
        headers: createHeaders(options?.token),
        body: JSON.stringify(data),
      },
      options
    )

    // POST Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('POST Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // POST Response data: responseData
    // POST Response data type: typeof responseData

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured POST response
      // Success: responseData.success
      // Data: responseData.data

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },

  async put<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T> {
    // Making PUT request to: ${API_BASE_URL}${endpoint}
    // Request data: JSON.stringify(data, null, 2)
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PUT',
        headers: createHeaders(options?.token),
        body: JSON.stringify(data),
      },
      options
    )

    // PUT Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PUT Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // PUT Response data: responseData
    // PUT Response data type: typeof responseData

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured PUT response
      // Success: responseData.success
      // Data: responseData.data

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    // Making DELETE request to: ${API_BASE_URL}${endpoint}
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'DELETE',
        headers: createHeaders(options?.token),
      },
      options
    )

    // DELETE Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('DELETE Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // DELETE Response data: responseData
    // DELETE Response data type: typeof responseData

    // バックエンドが {success: true, message: ...} 形式で返す場合の処理
    if (responseData && typeof responseData === 'object' && 'success' in responseData) {
      // Processing structured DELETE response
      // Success: responseData.success
      // Message: responseData.message

      if (responseData.success) {
        return responseData as T
      } else {
        throw new Error(
          `API error: ${responseData.error || responseData.message || 'Unknown error'}`
        )
      }
    }

    return responseData
  },

  async patch<T>(endpoint: string, data: unknown, options?: ApiOptions): Promise<T> {
    // Making PATCH request to: ${API_BASE_URL}${endpoint}
    // Request data: JSON.stringify(data, null, 2)
    // Headers: createHeaders(options?.token)

    const response = await makeApiRequest(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PATCH',
        headers: createHeaders(options?.token),
        body: JSON.stringify(data),
      },
      options
    )

    // PATCH Response status: response.status

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PATCH Response error text:', errorText)
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
    }

    const responseData = await response.json()
    // PATCH Response data: responseData
    // PATCH Response data type: typeof responseData

    // バックエンドが {success: true, data: {...}} 形式で返す場合の処理
    if (
      responseData &&
      typeof responseData === 'object' &&
      'success' in responseData &&
      'data' in responseData
    ) {
      // Processing structured PATCH response
      // Success: responseData.success
      // Data: responseData.data

      if (responseData.success) {
        return responseData.data
      } else {
        throw new Error(`API error: ${responseData.message || 'Unknown error'}`)
      }
    }

    return responseData
  },
}
