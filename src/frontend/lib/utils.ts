import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { z } from 'zod'

// ClassValue型の厳密な検証スキーマ（clsx公式仕様準拠）
const ClassValueSchema: z.ZodType<ClassValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.undefined(),
    z.record(z.string(), z.boolean()),
    z.array(ClassValueSchema),
  ])
)

const ClassValueArraySchema = z.array(ClassValueSchema)

/**
 * 型安全なclsxとtailwind-merge結合ユーティリティ
 * CSSクラス名を条件付きで結合し、Tailwind CSSの競合クラスを適切にマージします
 */
export function cn(...inputs: ClassValue[]): string {
  try {
    // 入力パラメータの検証
    ClassValueArraySchema.parse(inputs)

    const result = twMerge(clsx(inputs))

    // 結果が文字列であることを検証
    z.string().parse(result)

    return result
  } catch (error) {
    if (error instanceof z.ZodError) {
      // 開発環境でのみエラーログを出力
      if (import.meta.env?.DEV) {
        console.error('cn function validation failed:', error.errors)
      }
      // フォールバック: 空の文字列を返す
      return ''
    }
    throw error
  }
}
