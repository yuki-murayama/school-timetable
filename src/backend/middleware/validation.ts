import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

/**
 * バリデーションルール型定義
 */
interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'id'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
}

/**
 * 入力値バリデーション・サニタイゼーション関数
 */

/**
 * 文字列のサニタイゼーション
 */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/[<>"'&]/g, match => {
      const entities: Record<string, string> = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      }
      return entities[match] || match
    })
    .substring(0, 1000) // 最大長制限
}

/**
 * 数値バリデーション
 */
export function validateNumber(input: unknown, min: number = 0, max: number = 999999): number {
  const num = Number(input)

  if (Number.isNaN(num)) {
    throw new Error('Invalid number format')
  }

  if (num < min || num > max) {
    throw new Error(`Number must be between ${min} and ${max}`)
  }

  return num
}

/**
 * メールアドレスバリデーション
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

/**
 * IDフォーマットバリデーション
 */
export function validateId(id: string): boolean {
  return /^[a-zA-Z0-9\-_]+$/.test(id) && id.length >= 1 && id.length <= 100
}

/**
 * JSONバリデーション
 */
export function validateJSON(input: string): unknown {
  try {
    const parsed = JSON.parse(input)

    // 基本的なXSS対策
    const jsonString = JSON.stringify(parsed)
    if (jsonString.includes('<script') || jsonString.includes('javascript:')) {
      throw new Error('Potentially malicious content detected')
    }

    return parsed
  } catch (_error) {
    throw new Error('Invalid JSON format')
  }
}

/**
 * リクエストボディバリデーションミドルウェア
 */
export function validateRequestBody(schema: Record<string, ValidationRule>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validatedBody: Record<string, unknown> = {}

      for (const [key, rules] of Object.entries(schema)) {
        const value = body[key]

        // 必須フィールドチェック
        if (rules.required && (value === undefined || value === null || value === '')) {
          throw new HTTPException(400, { message: `Field '${key}' is required` })
        }

        // 値が存在する場合のバリデーション
        if (value !== undefined && value !== null) {
          switch (rules.type) {
            case 'string':
              validatedBody[key] = sanitizeString(value)
              if (rules.minLength && validatedBody[key].length < rules.minLength) {
                throw new HTTPException(400, {
                  message: `Field '${key}' must be at least ${rules.minLength} characters`,
                })
              }
              if (rules.maxLength && validatedBody[key].length > rules.maxLength) {
                throw new HTTPException(400, {
                  message: `Field '${key}' must be at most ${rules.maxLength} characters`,
                })
              }
              break

            case 'number':
              validatedBody[key] = validateNumber(value, rules.min, rules.max)
              break

            case 'email': {
              const sanitizedEmail = sanitizeString(value)
              if (!validateEmail(sanitizedEmail)) {
                throw new HTTPException(400, {
                  message: `Field '${key}' must be a valid email address`,
                })
              }
              validatedBody[key] = sanitizedEmail
              break
            }

            case 'array':
              if (!Array.isArray(value)) {
                throw new HTTPException(400, { message: `Field '${key}' must be an array` })
              }
              validatedBody[key] = value.map((item: unknown) =>
                typeof item === 'string' ? sanitizeString(item) : item
              )
              if (rules.maxItems && validatedBody[key].length > rules.maxItems) {
                throw new HTTPException(400, {
                  message: `Field '${key}' must have at most ${rules.maxItems} items`,
                })
              }
              break

            case 'boolean':
              validatedBody[key] = Boolean(value)
              break

            default:
              validatedBody[key] = value
          }
        }
      }

      // バリデーション済みボディをコンテキストに保存
      c.set('validatedBody', validatedBody)
      await next()
    } catch (error) {
      console.error('Request validation error:', error)

      if (error instanceof HTTPException) {
        throw error
      }

      throw new HTTPException(400, { message: 'Invalid request format' })
    }
  }
}

/**
 * SQLインジェクション対策：パラメータバリデーション
 */
export function validateSqlParameters(params: unknown[]): unknown[] {
  return params.map((param: unknown) => {
    if (typeof param === 'string') {
      // 危険な文字列パターンをチェック
      const dangerousPatterns = [
        /'\s*(OR|AND)\s+'/i,
        /'\s*;\s*/,
        /UNION\s+SELECT/i,
        /DROP\s+TABLE/i,
        /DELETE\s+FROM/i,
        /INSERT\s+INTO/i,
        /UPDATE\s+\w+\s+SET/i,
      ]

      for (const pattern of dangerousPatterns) {
        if (pattern.test(param)) {
          throw new Error('Potentially malicious SQL detected')
        }
      }

      return sanitizeString(param)
    }

    return param
  })
}

/**
 * パスパラメータバリデーション
 */
export function validatePathParams(allowedParams: string[]) {
  return async (c: Context, next: Next) => {
    try {
      // パスパラメータのバリデーション
      for (const paramName of allowedParams) {
        const paramValue = c.req.param(paramName)
        if (paramValue && !validateId(paramValue)) {
          throw new HTTPException(400, { message: `Invalid parameter format: ${paramName}` })
        }
      }

      await next()
    } catch (error) {
      console.error('Path parameter validation error:', error)

      if (error instanceof HTTPException) {
        throw error
      }

      throw new HTTPException(400, { message: 'Invalid path parameters' })
    }
  }
}

/**
 * レート制限チェック（基本実装）
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(maxRequests: number = 100, windowMs: number = 60000) {
  return async (c: Context, next: Next) => {
    const clientIP =
      c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown'
    const now = Date.now()
    const _windowStart = now - windowMs

    // 古いエントリを削除
    for (const [key, value] of rateLimitStore.entries()) {
      if (value.resetTime < now) {
        rateLimitStore.delete(key)
      }
    }

    const entry = rateLimitStore.get(clientIP)

    if (!entry) {
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs })
    } else if (entry.resetTime < now) {
      rateLimitStore.set(clientIP, { count: 1, resetTime: now + windowMs })
    } else {
      entry.count++

      if (entry.count > maxRequests) {
        throw new HTTPException(429, { message: 'Too many requests' })
      }
    }

    await next()
  }
}

/**
 * CSRF保護（基本実装）
 */
export function csrfProtection() {
  return async (c: Context, next: Next) => {
    const method = c.req.method

    // GET、HEAD、OPTIONSは保護しない
    if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      await next()
      return
    }

    // CSRFトークンをヘッダーから取得
    const _csrfToken = c.req.header('X-CSRF-Token')
    const referer = c.req.header('Referer')
    const origin = c.req.header('Origin')

    // 基本的なCSRF保護：Originチェック
    const allowedOrigin = 'https://school-timetable-monorepo.grundhunter.workers.dev'

    if (origin && origin !== allowedOrigin) {
      console.error('CSRF: Invalid origin:', origin)
      throw new HTTPException(403, { message: 'CSRF protection: Invalid origin' })
    }

    if (referer && !referer.startsWith(allowedOrigin)) {
      console.error('CSRF: Invalid referer:', referer)
      throw new HTTPException(403, { message: 'CSRF protection: Invalid referer' })
    }

    await next()
  }
}

/**
 * ファイルアップロード制限
 */
export function fileUploadLimits(maxSize: number = 10 * 1024 * 1024, allowedTypes: string[] = []) {
  return async (c: Context, next: Next) => {
    const contentLength = parseInt(c.req.header('content-length') || '0')

    if (contentLength > maxSize) {
      throw new HTTPException(413, { message: 'File too large' })
    }

    const contentType = c.req.header('content-type') || ''

    if (allowedTypes.length > 0 && !allowedTypes.some(type => contentType.includes(type))) {
      throw new HTTPException(415, { message: 'Unsupported file type' })
    }

    await next()
  }
}
