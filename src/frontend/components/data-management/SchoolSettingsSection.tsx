import type { SchoolSettings } from '@shared/schemas'
import { Loader2, Save } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { schoolApi } from '../../lib/api'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

interface SchoolSettingsSectionProps {
  settings: SchoolSettings
  onSettingsUpdate: (settings: SchoolSettings) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
  isLoading: boolean
  showOfflineButton: boolean
  onOfflineMode: () => void
}

export function SchoolSettingsSection({
  settings,
  onSettingsUpdate,
  token,
  getFreshToken,
  isLoading,
  showOfflineButton,
  onOfflineMode,
}: SchoolSettingsSectionProps) {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveSettings = async () => {
    if (!token) {
      toast({
        title: '認証エラー',
        description: 'ログインが必要です',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      // EnhancedSchoolSettingsから基本的な学校設定データのみを抽出（バックエンドが期待する形式）
      const basicSettings = {
        grade1Classes: settings.grade1Classes,
        grade2Classes: settings.grade2Classes,
        grade3Classes: settings.grade3Classes,
        grade4Classes: settings.grade4Classes || 3,
        grade5Classes: settings.grade5Classes || 3,
        grade6Classes: settings.grade6Classes || 3,
        dailyPeriods: settings.dailyPeriods,
        saturdayPeriods: settings.saturdayPeriods,
      }
      const updatedSettings = await schoolApi.updateSettings(basicSettings, { token, getFreshToken })
      onSettingsUpdate(updatedSettings)
      toast({
        title: '保存完了',
        description: '学校設定が正常に保存されました',
      })
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast({
        title: '保存エラー',
        description: '設定の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>クラス数・授業時間設定</CardTitle>
        <CardDescription>各学年のクラス数と授業時間を設定します</CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* オフラインモード（長時間読み込み時のフォールバック） */}
        {isLoading && showOfflineButton && (
          <div className='p-3 bg-gray-100 rounded text-sm'>
            <Button size='sm' variant='outline' onClick={onOfflineMode}>
              オフラインモードで続行
            </Button>
          </div>
        )}

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div>
            <Label htmlFor='grade1'>1年生クラス数</Label>
            <Input
              id='grade1'
              type='number'
              value={isLoading ? '' : settings.grade1Classes}
              placeholder={isLoading ? '読み込み中...' : 'クラス数を入力'}
              onChange={e =>
                onSettingsUpdate({
                  ...settings,
                  grade1Classes: Number.parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor='grade2'>2年生クラス数</Label>
            <Input
              id='grade2'
              type='number'
              value={isLoading ? '' : settings.grade2Classes}
              placeholder={isLoading ? '読み込み中...' : 'クラス数を入力'}
              onChange={e =>
                onSettingsUpdate({
                  ...settings,
                  grade2Classes: Number.parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor='grade3'>3年生クラス数</Label>
            <Input
              id='grade3'
              type='number'
              value={isLoading ? '' : settings.grade3Classes}
              placeholder={isLoading ? '読み込み中...' : 'クラス数を入力'}
              onChange={e =>
                onSettingsUpdate({
                  ...settings,
                  grade3Classes: Number.parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <Label htmlFor='daily'>1日の授業数</Label>
            <Input
              id='daily'
              type='number'
              value={isLoading ? '' : settings.dailyPeriods}
              placeholder={isLoading ? '読み込み中...' : '授業数を入力'}
              onChange={e =>
                onSettingsUpdate({
                  ...settings,
                  dailyPeriods: Number.parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor='saturday'>土曜の授業数</Label>
            <Input
              id='saturday'
              type='number'
              value={isLoading ? '' : settings.saturdayPeriods}
              placeholder={isLoading ? '読み込み中...' : '授業数を入力'}
              onChange={e =>
                onSettingsUpdate({
                  ...settings,
                  saturdayPeriods: Number.parseInt(e.target.value) || 0,
                })
              }
              disabled={isLoading}
            />
          </div>
        </div>

        <Button className='w-full' onClick={handleSaveSettings} disabled={isLoading || isSaving}>
          {isSaving ? (
            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          ) : (
            <Save className='w-4 h-4 mr-2' />
          )}
          {isSaving ? '保存中...' : '設定を保存'}
        </Button>
      </CardContent>
    </Card>
  )
}
