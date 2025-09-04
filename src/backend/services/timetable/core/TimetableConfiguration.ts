/**
 * 時間割設定管理クラス
 */

import type { SchoolSettings } from '@shared/schemas'

export class TimetableConfiguration {
  private settings: SchoolSettings

  constructor(settings?: SchoolSettings | null) {
    this.settings = this.createSafeSettings(settings)
  }

  getSettings(): SchoolSettings {
    return this.settings
  }

  updateSettings(newSettings: SchoolSettings): void {
    this.settings = this.createSafeSettings(newSettings)
  }

  getSafeDays(): string[] {
    return this.settings?.days || ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']
  }

  /**
   * 学年別設定を取得
   */
  getGradeSettings(grade: number): { classes: number } {
    switch (grade) {
      case 1:
        return { classes: this.settings.grade1Classes }
      case 2:
        return { classes: this.settings.grade2Classes }
      case 3:
        return { classes: this.settings.grade3Classes }
      default:
        return { classes: 4 } // デフォルト
    }
  }

  private createSafeSettings(settings: SchoolSettings | null | undefined): SchoolSettings {
    if (!settings) {
      return this.getDefaultSettings()
    }

    // 安全な数値変換関数
    const safeNumber = (value: unknown, defaultValue: number): number => {
      try {
        if (value === null || value === undefined) return defaultValue
        const parsed = Number(value)
        return Number.isNaN(parsed) ? defaultValue : parsed
      } catch {
        return defaultValue
      }
    }

    // 各プロパティを安全に設定
    const safeSettings: SchoolSettings = {
      id: settings.id || 'default',
      grade1Classes: safeNumber(settings.grade1Classes, 4),
      grade2Classes: safeNumber(settings.grade2Classes, 4),
      grade3Classes: safeNumber(settings.grade3Classes, 3),
      dailyPeriods: safeNumber(settings.dailyPeriods, 6),
      saturdayPeriods: safeNumber(settings.saturdayPeriods, 4),
      days:
        settings.days && Array.isArray(settings.days) && settings.days.length > 0
          ? settings.days
          : ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      grades:
        settings.grades && Array.isArray(settings.grades) && settings.grades.length > 0
          ? settings.grades
          : [1, 2, 3],
      classesPerGrade:
        settings.classesPerGrade && typeof settings.classesPerGrade === 'object'
          ? settings.classesPerGrade
          : {
              1: Array.from({ length: safeNumber(settings.grade1Classes, 4) }, (_, i) =>
                String(i + 1)
              ),
              2: Array.from({ length: safeNumber(settings.grade2Classes, 4) }, (_, i) =>
                String(i + 1)
              ),
              3: Array.from({ length: safeNumber(settings.grade3Classes, 3) }, (_, i) =>
                String(i + 1)
              ),
            },
      created_at: settings.created_at,
      updated_at: settings.updated_at,
    }

    return safeSettings
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): SchoolSettings {
    return {
      id: 'default',
      grade1Classes: 4,
      grade2Classes: 4,
      grade3Classes: 3,
      dailyPeriods: 6,
      saturdayPeriods: 4,
      days: ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜'],
      grades: [1, 2, 3],
      classesPerGrade: {
        1: ['1', '2', '3', '4'],
        2: ['1', '2', '3', '4'],
        3: ['1', '2', '3'],
      },
    }
  }
}
