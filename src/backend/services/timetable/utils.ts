/**
 * 時間割生成用ユーティリティ関数
 */

/**
 * ログ出力（デバッグモード制御付き）
 */
export function createLogger(debugMode: boolean = false) {
  return (...args: unknown[]): void => {
    if (debugMode) {
      console.log('[TimetableGenerator]', ...args)
    }
  }
}

/**
 * 配列をシャッフル（Fisher-Yates shuffle）
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * 配列をランダムに選択
 */
export function getRandomElement<T>(array: T[]): T | undefined {
  if (array.length === 0) return undefined
  const randomIndex = Math.floor(Math.random() * array.length)
  return array[randomIndex]
}

/**
 * 範囲内の整数を生成
 */
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * パーセンテージを安全に計算
 */
export function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0
  return Math.round((numerator / denominator) * 100 * 100) / 100 // 小数点2桁
}

/**
 * 配列を条件に基づいてグループ化
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFunction: (item: T) => K
): Map<K, T[]> {
  const grouped = new Map<K, T[]>()

  for (const item of array) {
    const key = keyFunction(item)
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    const group = grouped.get(key)
    if (group) {
      group.push(item)
    }
  }

  return grouped
}

/**
 * 深いコピー（簡易版）
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}
