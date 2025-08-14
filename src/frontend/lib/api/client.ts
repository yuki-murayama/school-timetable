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
    'X-CSRF-Token': getCSRFToken(), // セッション単位でキャッシュ
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

// セッション単位でCSRFトークンをキャッシュ
let sessionCSRFToken: string | null = null

function getCSRFToken(): string {
  if (!sessionCSRFToken) {
    sessionCSRFToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return sessionCSRFToken
}

// Helper function to handle API requests with simplified token management
const makeApiRequest = async (
  url: string,
  options: RequestInit,
  apiOptions?: ApiOptions
): Promise<Response> => {
  // シンプルなアプローチ: 1セッション1トークン、期限チェック不要
  const currentToken = apiOptions?.token

  let response = await fetch(url, options)

  // If we get a 401 and have a token refresh function, try once to refresh and retry
  if (response.status === 401 && apiOptions?.getFreshToken) {
    console.log('🔄 401エラー検出、トークン更新を試行中...')
    try {
      const freshToken = await apiOptions.getFreshToken()
      if (freshToken) {
        console.log('✅ トークン更新成功、リクエスト再試行中...')
        
        // 1回のみ再試行（シンプル化）
        const newHeaders = {
          ...options.headers,
          ...createHeaders(freshToken),
        }
        response = await fetch(url, { ...options, headers: newHeaders })
        console.log(`🔄 再試行結果: ${response.status}`)

        // まだ401の場合は認証の根本的な問題
        if (response.status === 401) {
          console.error('⚠️ 再試行後も401エラー、認証システムに問題があります')
          throw new Error('認証に失敗しました。ページを再読み込みして再度ログインしてください。')
        }
      } else {
        console.error('❌ トークン更新失敗: 新しいトークンが取得できませんでした')
        throw new Error('認証トークンの更新に失敗しました。再度ログインしてください。')
      }
    } catch (refreshError: unknown) {
      console.error('❌ トークン更新処理でエラー:', refreshError)
      if (refreshError instanceof Error && refreshError.message.includes('認証')) {
        throw refreshError
      }
      const errorMessage = refreshError instanceof Error ? refreshError.message : '不明なエラー'
      throw new Error(`認証エラー: ${errorMessage}`)
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
