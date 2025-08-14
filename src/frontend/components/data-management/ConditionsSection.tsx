import { Loader2, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { conditionsApi } from '../../lib/api'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Textarea } from '../ui/textarea'

interface ConditionsSectionProps {
  token: string | null
  getFreshToken?: () => Promise<string | null>
}

export function ConditionsSection({ token, getFreshToken }: ConditionsSectionProps) {
  const { toast } = useToast()

  const [conditions, setConditions] = useState('')
  const [isConditionsLoading, setIsConditionsLoading] = useState(true)
  const [isConditionsSaving, setIsConditionsSaving] = useState(false)

  // Load conditions data
  useEffect(() => {
    const loadConditions = async () => {
      if (!token) {
        setIsConditionsLoading(false)
        return
      }

      setIsConditionsLoading(true)

      try {
        const conditionsData = await conditionsApi.getConditions({ token, getFreshToken })
        setConditions(conditionsData.conditions || '')
      } catch (error) {
        console.error('Error loading conditions:', error)
        // 条件設定の読み込みエラーは無視して空文字列で継続
        setConditions('')
      } finally {
        setIsConditionsLoading(false)
      }
    }

    loadConditions()
  }, [token])

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
      await conditionsApi.saveConditions({ conditions }, { token, getFreshToken })
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
            isConditionsLoading ? '読み込み中...' : '例：体育は午後に配置、数学は1時間目を避ける...'
          }
          rows={6}
          value={conditions}
          onChange={e => setConditions(e.target.value)}
          disabled={isConditionsLoading}
        />

        <Button
          className='w-full mt-6'
          onClick={handleSaveConditions}
          disabled={isConditionsLoading || isConditionsSaving}
        >
          {isConditionsSaving ? (
            <Loader2 className='w-4 h-4 mr-2 animate-spin' />
          ) : (
            <Save className='w-4 h-4 mr-2' />
          )}
          {isConditionsSaving ? '保存中...' : '条件設定を保存'}
        </Button>
      </CardContent>
    </Card>
  )
}
