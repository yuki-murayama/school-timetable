import type { SchoolSettings } from '../types'

// デフォルト設定
export const defaultSettings: SchoolSettings = {
  grade1Classes: 4,
  grade2Classes: 4,
  grade3Classes: 3,
  dailyPeriods: 6,
  saturdayPeriods: 4,
}

// CORS設定
export const corsConfig = {
  origin: [
    'http://localhost:3000',
    'https://school-timetable-frontend.vercel.app',
    'https://master.school-timetable-frontend.pages.dev',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Request-ID',
    'Accept',
    'Origin',
    'X-Requested-With',
  ],
  credentials: true,
  maxAge: 86400,
}

// 曜日リスト
export const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

// タイムアウト設定
export const GENERATION_TIMEOUT = 30000 // 30秒
export const MAX_RETRY_COUNT = 3

// Groq APIレート制限対応
export const GROQ_RATE_LIMIT_DELAY = 5000 // 5秒待機
export const GROQ_MAX_RETRIES = 2 // 429エラー時の最大リトライ回数
