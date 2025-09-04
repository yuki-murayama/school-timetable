import { ValidationError } from '@shared/schemas'
import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'

/**
 * バリデーションルール型定義
 */
interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'email' | 'id' | 'array' | 'boolean'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  maxItems?: number
}

// 文字列検証スキーマ
const StringInputSchema = z.union([
  z.string(),
  z.number().transform(val => String(val)),
  z.null().transform(() => ''),
  z.undefined().transform(() => ''),
])

// 数値検証スキーマ
const NumberInputSchema = z.union([
  z.number(),
  z.string().transform(val => {
    const num = Number(val)
    if (Number.isNaN(num)) {
      throw new Error('数値に変換できません')
    }
    return num
  }),
])

// メール検証スキーマ
const EmailSchema = z.string().email('有効なメールアドレスを入力してください')

// ID検証スキーマ
const IdSchema = z
  .string()
  .regex(/^[a-zA-Z0-9\-_]+$/, 'IDは英数字とハイフン、アンダースコアのみ使用可能です')
  .min(1, 'IDは必須です')
  .max(100, 'IDは100文字以下で入力してください')

// JSON検証スキーマ
const JsonStringSchema = z.string().transform((val, ctx) => {
  try {
    const parsed = JSON.parse(val)

    // XSS対策の基本チェック
    const jsonString = JSON.stringify(parsed)
    if (jsonString.includes('<script') || jsonString.includes('javascript:')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '危険なコンテンツが検出されました',
      })
      return z.NEVER
    }

    return parsed
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '有効なJSON形式で入力してください',
    })
    return z.NEVER
  }
})

// SQLパラメータ検証スキーマ
const SqlParameterSchema = z.unknown().transform((param, ctx) => {
  if (typeof param === 'string') {
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
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'SQLインジェクションの可能性があるパラメータが検出されました',
        })
        return z.NEVER
      }
    }
  }
  return param
})

/**
 * 入力値バリデーション・サニタイゼーション関数
 */

/**
 * 型安全な文字列サニタイゼーション
 */
export function sanitizeString(input: unknown): string {
  try {
    const sanitized = StringInputSchema.parse(input)

    return sanitized
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('文字列の検証に失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全な数値バリデーション
 */
export function validateNumber(input: unknown, min: number = 0, max: number = 999999): number {
  try {
    const num = NumberInputSchema.parse(input)

    if (num < min || num > max) {
      throw new ValidationError(`数値は${min}以上${max}以下で入力してください`, [
        {
          code: 'out_of_range',
          path: [],
          message: `数値は${min}以上${max}以下である必要があります`,
        },
      ])
    }

    return num
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error
    }
    if (error instanceof z.ZodError) {
      throw new ValidationError('数値の検証に失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全なメールアドレスバリデーション
 */
export function validateEmail(email: string): boolean {
  try {
    EmailSchema.parse(email)
    return email.length <= 254
  } catch {
    return false
  }
}

/**
 * 型安全なメールアドレス検証（エラーを投げる版）
 */
export function validateEmailStrict(input: unknown): string {
  try {
    const email = StringInputSchema.parse(input)
    return EmailSchema.max(254, 'メールアドレスは254文字以下で入力してください').parse(email)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('メールアドレスの検証に失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * IDフォーマットバリデーション
 */
export function validateId(id: string): boolean {
  try {
    IdSchema.parse(id)
    return true
  } catch {
    return false
  }
}

/**
 * 型安全なID検証（エラーを投げる版）
 */
export function validateIdStrict(input: unknown): string {
  try {
    const id = StringInputSchema.parse(input)
    return IdSchema.parse(id)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('IDの検証に失敗しました', error.errors)
    }
    throw error
  }
}

/**
 * 型安全なJSONバリデーション
 */
export function validateJSON(input: string): unknown {
  try {
    return JsonStringSchema.parse(input)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('JSONの検証に失敗しました', error.errors)
    }
    throw error
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
 * 型安全なSQLインジェクション対策：パラメータバリデーション
 */
export function validateSqlParameters(params: unknown[]): unknown[] {
  try {
    return params.map((param: unknown) => {
      const validated = SqlParameterSchema.parse(param)

      if (typeof validated === 'string') {
        return sanitizeString(validated)
      }

      return validated
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('SQLパラメータの検証に失敗しました', error.errors)
    }
    throw error
  }
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
    // セキュリティ：レート制限バイパス機能は削除済み（セキュリティリスクのため）

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

    // セキュリティ：CSRF保護バイパス機能は削除済み（セキュリティリスクのため）

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
