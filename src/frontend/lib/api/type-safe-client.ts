/**
 * 完全型安全APIクライアント - Zodランタイム型検証付き
 * すべてのAPI通信で入力・出力の型安全性を保証
 */

import {
  type ApiErrorResponse,
  ApiErrorResponseSchema,
  type ApiSuccessResponse,
  ApiSuccessResponseSchema,
} from '@shared/schemas'
import type { z } from 'zod'
import type { ApiOptions } from './client'

// ======================
// 型安全エラークラス
// ======================
export class TypeSafeApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorResponse: ApiErrorResponse,
    public readonly originalResponse?: Response
  ) {
    super(`API Error ${status}: ${errorResponse.message}`)
    this.name = 'TypeSafeApiError'
  }
}

export class ValidationError extends Error {
  constructor(
    public readonly validationErrors: z.ZodIssue[],
    public readonly originalData: unknown
  ) {
    super(`Validation failed: ${validationErrors.map(e => e.message).join(', ')}`)
    this.name = 'ValidationError'
  }
}

// ======================
// 型安全APIクライアント設定
// ======================
interface TypeSafeApiOptions extends ApiOptions {
  /** 基底URL - デフォルトは環境変数から取得 */
  baseUrl?: string
  /** リクエストタイムアウト(ms) - デフォルト30秒 */
  timeout?: number
  /** リトライ回数 - デフォルト1回 */
  retryCount?: number
  /** デバッグモード - レスポンス詳細ログ出力 */
  debug?: boolean
  /** テスト用: リトライ遅延を無効化 */
  disableRetryDelay?: boolean
}

const API_BASE_URL = '/api'

// CSRFトークン管理（既存実装を継承）
let sessionCSRFToken: string | null = null

const getCSRFToken = (): string => {
  if (!sessionCSRFToken) {
    sessionCSRFToken = Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  return sessionCSRFToken
}

// 型安全ヘッダー作成
const createTypeSafeHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-CSRF-Token': getCSRFToken(),
    'X-Client-Version': '1.0.0',
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

// ======================
// 型安全リクエスト実行エンジン
// ======================
const executeTypeSafeRequest = async <TResponse>(
  url: string,
  options: RequestInit,
  responseSchema: z.ZodType<ApiSuccessResponse<TResponse>>,
  apiOptions?: TypeSafeApiOptions
): Promise<TResponse> => {
  const {
    timeout = 30000,
    retryCount = 1,
    debug = false,
    disableRetryDelay = false,
    ...restOptions
  } = apiOptions || {}

  // タイムアウト制御
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    let response: Response

    // リトライロジック
    for (let attempt = 0; attempt <= retryCount; attempt++) {
      try {
        if (debug) {
          console.log(`🚀 API Request [attempt ${attempt + 1}/${retryCount + 1}]`, {
            url,
            method: options.method || 'GET',
            headers: options.headers,
          })
        }

        response = await fetch(url, {
          ...options,
          signal: controller.signal,
        })

        // 401の場合、トークンリフレッシュを試行（1回のみ）
        if (response.status === 401 && attempt === 0 && restOptions.getFreshToken) {
          if (debug) console.log('🔄 Token refresh attempt...')

          const freshToken = await restOptions.getFreshToken()
          if (freshToken) {
            const refreshedHeaders = {
              ...options.headers,
              ...createTypeSafeHeaders(freshToken),
            }

            response = await fetch(url, {
              ...options,
              headers: refreshedHeaders,
              signal: controller.signal,
            })

            if (debug) console.log(`🔄 Retry result: ${response.status}`)
          }
        }

        // 成功またはクライアントエラー（4xx）の場合はリトライしない
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          break
        }

        // サーバーエラー（5xx）の場合はリトライ
        if (attempt < retryCount) {
          const delay = Math.min(1000 * 2 ** attempt, 5000) // 指数バックオフ
          if (debug) console.log(`⏳ Retrying in ${delay}ms...`)
          if (!disableRetryDelay) {
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      } catch (error) {
        if (attempt === retryCount) throw error

        const delay = Math.min(1000 * 2 ** attempt, 5000)
        if (debug) console.log(`⏳ Network error, retrying in ${delay}ms...`, error)
        if (!disableRetryDelay) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    clearTimeout(timeoutId)

    // レスポンス解析
    const responseText = await response.text()

    if (debug) {
      console.log(`📥 API Response [${response.status}]`, {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 500) + (responseText.length > 500 ? '...' : ''),
      })
    }

    // JSON パース
    let responseData: unknown
    try {
      responseData = responseText ? JSON.parse(responseText) : {}
    } catch (_parseError) {
      throw new TypeSafeApiError(
        response.status,
        {
          success: false,
          error: 'INVALID_JSON',
          message: 'サーバーからの応答が有効なJSONではありません',
        },
        response
      )
    }

    // エラーレスポンス処理
    if (!response.ok) {
      const errorParseResult = ApiErrorResponseSchema.safeParse(responseData)

      const errorResponse: ApiErrorResponse = errorParseResult.success
        ? errorParseResult.data
        : {
            success: false,
            error: 'UNKNOWN_ERROR',
            message: `HTTPエラー ${response.status}: ${response.statusText}`,
            details: { originalData: responseData },
          }

      throw new TypeSafeApiError(response.status, errorResponse, response)
    }

    // 成功レスポンスの型検証
    const validationResult = responseSchema.safeParse(responseData)

    if (!validationResult.success) {
      if (debug) {
        console.error('❌ Response validation failed', {
          errors: validationResult.error.issues,
          responseData,
        })
      }

      throw new ValidationError(validationResult.error.issues, responseData)
    }

    if (debug) {
      console.log('✅ API Request completed successfully')
    }

    return validationResult.data.data
  } catch (error) {
    clearTimeout(timeoutId)

    if (error instanceof TypeSafeApiError || error instanceof ValidationError) {
      throw error
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new TypeSafeApiError(408, {
        success: false,
        error: 'TIMEOUT',
        message: `リクエストがタイムアウトしました（${timeout}ms）`,
      })
    }

    throw new TypeSafeApiError(0, {
      success: false,
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : '不明なネットワークエラー',
    })
  }
}

// ======================
// 型安全APIクライアント実装
// ======================
export class TypeSafeApiClient {
  private readonly baseUrl: string

  constructor(private readonly defaultOptions?: TypeSafeApiOptions) {
    this.baseUrl = defaultOptions?.baseUrl || API_BASE_URL
  }

  /** 型安全GET要求 */
  async get<TResponse>(
    endpoint: string,
    responseSchema: z.ZodType<TResponse>,
    options?: TypeSafeApiOptions
  ): Promise<TResponse> {
    const successResponseSchema = ApiSuccessResponseSchema(responseSchema)

    return executeTypeSafeRequest(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'GET',
        headers: createTypeSafeHeaders(options?.token || this.defaultOptions?.token),
      },
      successResponseSchema,
      { ...this.defaultOptions, ...options }
    )
  }

  /** 型安全POST要求 */
  async post<TRequest, TResponse>(
    endpoint: string,
    data: TRequest,
    requestSchema: z.ZodType<TRequest>,
    responseSchema: z.ZodType<TResponse>,
    options?: TypeSafeApiOptions
  ): Promise<TResponse> {
    // リクエストデータの型検証
    const validationResult = requestSchema.safeParse(data)
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.issues, data)
    }

    const successResponseSchema = ApiSuccessResponseSchema(responseSchema)

    return executeTypeSafeRequest(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'POST',
        headers: createTypeSafeHeaders(options?.token || this.defaultOptions?.token),
        body: JSON.stringify(validationResult.data),
      },
      successResponseSchema,
      { ...this.defaultOptions, ...options }
    )
  }

  /** 型安全PUT要求 */
  async put<TRequest, TResponse>(
    endpoint: string,
    data: TRequest,
    requestSchema: z.ZodType<TRequest>,
    responseSchema: z.ZodType<TResponse>,
    options?: TypeSafeApiOptions
  ): Promise<TResponse> {
    const validationResult = requestSchema.safeParse(data)
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.issues, data)
    }

    const successResponseSchema = ApiSuccessResponseSchema(responseSchema)

    return executeTypeSafeRequest(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'PUT',
        headers: {
          ...createTypeSafeHeaders(options?.token || this.defaultOptions?.token),
          ...options?.headers,
        },
        body: JSON.stringify(validationResult.data),
      },
      successResponseSchema,
      { ...this.defaultOptions, ...options }
    )
  }

  /** 型安全PATCH要求 */
  async patch<TRequest, TResponse>(
    endpoint: string,
    data: TRequest,
    requestSchema: z.ZodType<TRequest>,
    responseSchema: z.ZodType<TResponse>,
    options?: TypeSafeApiOptions
  ): Promise<TResponse> {
    const validationResult = requestSchema.safeParse(data)
    if (!validationResult.success) {
      throw new ValidationError(validationResult.error.issues, data)
    }

    const successResponseSchema = ApiSuccessResponseSchema(responseSchema)

    return executeTypeSafeRequest(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'PATCH',
        headers: createTypeSafeHeaders(options?.token || this.defaultOptions?.token),
        body: JSON.stringify(validationResult.data),
      },
      successResponseSchema,
      { ...this.defaultOptions, ...options }
    )
  }

  /** 型安全DELETE要求 */
  async delete<TResponse = { message: string }>(
    endpoint: string,
    responseSchema: z.ZodType<TResponse>,
    options?: TypeSafeApiOptions
  ): Promise<TResponse> {
    const successResponseSchema = ApiSuccessResponseSchema(responseSchema)

    return executeTypeSafeRequest(
      `${this.baseUrl}${endpoint}`,
      {
        method: 'DELETE',
        headers: createTypeSafeHeaders(options?.token || this.defaultOptions?.token),
      },
      successResponseSchema,
      { ...this.defaultOptions, ...options }
    )
  }
}

// ======================
// デフォルトクライアント・ユーティリティ
// ======================

/** デフォルト型安全APIクライアントインスタンス */
export const typeSafeApiClient = new TypeSafeApiClient({
  timeout: 30000,
  retryCount: 1,
  debug: import.meta.env.DEV,
})

/** エラーハンドリングヘルパー */
export const handleApiError = (error: unknown): string => {
  if (error instanceof TypeSafeApiError) {
    return error.errorResponse.message
  }

  if (error instanceof ValidationError) {
    return `データ形式エラー: ${error.validationErrors.map(e => e.message).join(', ')}`
  }

  return error instanceof Error ? error.message : '不明なエラーが発生しました'
}

/** APIエラー判定ヘルパー */
export const isApiError = (error: unknown): error is TypeSafeApiError => {
  return error instanceof TypeSafeApiError
}

export const isValidationError = (error: unknown): error is ValidationError => {
  return error instanceof ValidationError
}

/** 型安全レスポンス型ヘルパー */
export type TypeSafeApiResponse<T> = Promise<T>

// ======================
// 開発者向けデバッグユーティリティ
// ======================

/** レスポンス型検証のみ実行（デバッグ用） */
export const validateResponseType = <T>(
  data: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } => {
  const result = schema.safeParse(data)
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: result.error.issues }
}

// APIクライアント統計情報は未使用のため削除されました
