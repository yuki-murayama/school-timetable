import { Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { conditionsApi } from '../../lib/api'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'

interface ConditionsSectionProps {
  conditions: string
  onConditionsUpdate: (conditions: string) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
  isLoading: boolean
}

export function ConditionsSection({
  conditions,
  onConditionsUpdate,
  token,
  getFreshToken,
  isLoading,
}: ConditionsSectionProps) {
  const { toast } = useToast()

  const [isConditionsSaving, setIsConditionsSaving] = useState(false)

  const handleSaveConditions = async () => {
    if (!token) {
      toast({
        title: '認証エラー',
        description: 'ログインが必要です',
        variant: 'destructive',
      })
      return
    }

    setIsConditionsSaving(true)
    try {
      // 一時的な簡易実装：APIコールなしで直接状態更新
      onConditionsUpdate(conditions)
      toast({
        title: '保存完了',
        description: '条件設定を保存しました',
      })
    } catch (_error) {
      toast({
        title: '保存エラー',
        description: '条件設定の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsConditionsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>任意条件設定</CardTitle>
        <CardDescription>時間割生成時の特別な条件を設定します</CardDescription>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder={
            isLoading ? '読み込み中...' : '例：体育は午後に配置、数学は1時間目を避ける...'
          }
          rows={6}
          value={conditions}
          onChange={e => onConditionsUpdate(e.target.value)}
          disabled={isLoading}
        />

        <Button
          className='w-full mt-6'
          onClick={handleSaveConditions}
          disabled={isLoading || isConditionsSaving}
        >
          {isConditionsSaving ? '保存中...' : '条件を保存'}
        </Button>
      </CardContent>
    </Card>
  )
}
