import { describe, expect, it } from 'vitest'
import { corsConfig, defaultSettings } from '../../../../src/backend/config'

describe('Backend Config', () => {
  describe('基本プロパティテスト', () => {
    it('テストフレームワークが正しく設定されている', () => {
      expect(describe).toBeDefined()
      expect(it).toBeDefined()
      expect(expect).toBeDefined()
    })

    it('defaultSettingsが正しく定義されている', () => {
      expect(defaultSettings).toBeDefined()
      expect(typeof defaultSettings).toBe('object')
      expect(defaultSettings.grade1Classes).toBeDefined()
      expect(typeof defaultSettings.grade1Classes).toBe('number')
      expect(defaultSettings.grade2Classes).toBeDefined()
      expect(typeof defaultSettings.grade2Classes).toBe('number')
      expect(defaultSettings.grade3Classes).toBeDefined()
      expect(typeof defaultSettings.grade3Classes).toBe('number')
      expect(defaultSettings.dailyPeriods).toBeDefined()
      expect(typeof defaultSettings.dailyPeriods).toBe('number')
      expect(defaultSettings.saturdayPeriods).toBeDefined()
      expect(typeof defaultSettings.saturdayPeriods).toBe('number')
    })

    it('defaultSettingsの値が適切な範囲内にある', () => {
      expect(defaultSettings.grade1Classes).toBeGreaterThan(0)
      expect(defaultSettings.grade1Classes).toBeLessThanOrEqual(10)
      expect(defaultSettings.grade2Classes).toBeGreaterThan(0)
      expect(defaultSettings.grade2Classes).toBeLessThanOrEqual(10)
      expect(defaultSettings.grade3Classes).toBeGreaterThan(0)
      expect(defaultSettings.grade3Classes).toBeLessThanOrEqual(10)
      expect(defaultSettings.dailyPeriods).toBeGreaterThan(0)
      expect(defaultSettings.dailyPeriods).toBeLessThanOrEqual(12)
      expect(defaultSettings.saturdayPeriods).toBeGreaterThan(0)
      expect(defaultSettings.saturdayPeriods).toBeLessThanOrEqual(12)
    })

    it('corsConfigが正しく定義されている', () => {
      expect(corsConfig).toBeDefined()
      expect(typeof corsConfig).toBe('object')
      expect(corsConfig.origin).toBeDefined()
      expect(Array.isArray(corsConfig.origin)).toBe(true)
      expect(corsConfig.allowMethods).toBeDefined()
      expect(Array.isArray(corsConfig.allowMethods)).toBe(true)
      expect(corsConfig.allowHeaders).toBeDefined()
      expect(Array.isArray(corsConfig.allowHeaders)).toBe(true)
    })

    it('corsConfig.originにHTTPとHTTPSのURLが含まれている', () => {
      const origins = corsConfig.origin as string[]
      expect(origins.length).toBeGreaterThan(0)

      const hasLocalhost = origins.some(url => url.includes('localhost'))
      const hasHttps = origins.some(url => url.startsWith('https://'))

      expect(hasLocalhost).toBe(true)
      expect(hasHttps).toBe(true)
    })

    it('corsConfig.allowMethodsに必要なHTTPメソッドが含まれている', () => {
      const methods = corsConfig.allowMethods
      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
      expect(methods).toContain('PUT')
      expect(methods).toContain('DELETE')
      expect(methods).toContain('OPTIONS')
    })

    it('corsConfig.allowHeadersが配列として定義されている', () => {
      expect(Array.isArray(corsConfig.allowHeaders)).toBe(true)
      expect(corsConfig.allowHeaders.length).toBeGreaterThan(0)
    })

    it('設定値がイミュータブルではない（変更可能）', () => {
      // 設定値のコピーを作成して変更テスト
      const settingsCopy = { ...defaultSettings }
      settingsCopy.grade1Classes = 5
      expect(settingsCopy.grade1Classes).toBe(5)
      expect(defaultSettings.grade1Classes).not.toBe(5) // 元の値は変わらない
    })

    it('JavaScript基本機能が利用可能', () => {
      expect(Object).toBeDefined()
      expect(typeof Object.keys).toBe('function')
      expect(Array).toBeDefined()
      expect(typeof Array.isArray).toBe('function')
    })

    it('設定オブジェクトのキーが正しく列挙される', () => {
      const settingsKeys = Object.keys(defaultSettings)
      expect(settingsKeys).toContain('grade1Classes')
      expect(settingsKeys).toContain('grade2Classes')
      expect(settingsKeys).toContain('grade3Classes')
      expect(settingsKeys).toContain('dailyPeriods')
      expect(settingsKeys).toContain('saturdayPeriods')
      expect(settingsKeys.length).toBeGreaterThanOrEqual(5)

      const corsKeys = Object.keys(corsConfig)
      expect(corsKeys).toContain('origin')
      expect(corsKeys).toContain('allowMethods')
      expect(corsKeys).toContain('allowHeaders')
    })
  })
})
