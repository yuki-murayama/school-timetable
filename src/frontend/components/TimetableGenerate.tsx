import { CheckCircle, Loader2, Settings } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useToast } from '../hooks/use-toast'
import { type TimetableGenerationResponse, timetableApi } from '../lib/api'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'

export function TimetableGenerate() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [isDetailMode, setIsDetailMode] = useState(false)
  const [detailConditions, setDetailConditions] = useState({
    noConsecutive: true,
    jointClasses: '',
    customConditions: '',
  })

  // プログラム型生成のための状態管理
  const [generationResult, setGenerationResult] = useState<TimetableGenerationResponse | null>(null)
  const [isGeneratingProgram, setIsGeneratingProgram] = useState(false)

  const handleGenerate = async () => {
    if (!token) {
      toast({
        title: '認証エラー',
        description: 'ログインが必要です',
        variant: 'destructive',
      })
      return
    }

    // プログラム型生成を実行
    await handleProgramGenerate()
  }

  const handleProgramGenerate = async () => {
    if (!token) return

    setIsGeneratingProgram(true)
    setGenerationResult(null)

    try {
      console.log('🔧 プログラム型時間割生成開始...')

      const result = await timetableApi.generateProgramTimetable({ token })

      // APIクライアントはdata部分のみを返すため、timetableとstatisticsの存在で成功判定
      if (result?.timetable && result.statistics) {
        console.log('✅ プログラム型生成成功:', result.statistics)

        toast({
          title: '生成完了',
          description: `時間割生成が完了しました（生成時間: ${result.statistics.generationTime || '不明'}, 割当数: ${result.statistics.totalAssignments || 0}）`,
        })

        setGenerationResult({
          success: true,
          data: {
            timetable: result.timetable,
            id: `program-${Date.now()}`,
            title: `プログラム生成時間割 ${new Date().toLocaleString()}`,
            created_at: result.generatedAt,
            metadata: {
              method: result.method,
              statistics: result.statistics,
            },
          },
        })
      } else {
        console.log('❌ プログラム型生成失敗: 予期しないレスポンス形式')

        toast({
          title: '生成失敗',
          description: '時間割生成に失敗しました',
          variant: 'destructive',
        })

        // statistics が存在する場合の詳細表示
        if (result && result.statistics && result.statistics.backtrackCount !== undefined) {
          toast({
            title: '生成統計',
            description: `バックトラック回数: ${result.statistics.backtrackCount}`,
          })
        }
      }
    } catch (error) {
      console.error('❌ プログラム型生成エラー:', error)

      toast({
        title: '生成エラー',
        description: '時間割生成中にエラーが発生しました',
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingProgram(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>時間割生成</h1>
          <p className='text-muted-foreground mt-2'>条件を指定して新しい時間割を生成します</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle className='flex items-center space-x-2'>
                <Settings className='w-5 h-5' />
                <span>生成モード</span>
              </CardTitle>
              <CardDescription>簡易モードまたは詳細モードを選択してください</CardDescription>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2'>
                <Label htmlFor='mode-toggle' className='text-sm'>
                  {isDetailMode ? '詳細モード' : '簡易モード'}
                </Label>
                <Switch id='mode-toggle' checked={isDetailMode} onCheckedChange={setIsDetailMode} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-6'>
          <div className='space-y-6'>
            <div className='space-y-4'>
              <h3 className='text-lg font-semibold flex items-center space-x-2'>
                <Settings className='w-5 h-5' />
                <span>詳細条件設定</span>
              </h3>

              <div className='flex items-center justify-between p-4 border rounded-lg'>
                <div>
                  <Label className='text-base'>同一科目の連続配置制限</Label>
                  <p className='text-sm text-muted-foreground'>
                    同一科目を連続した時間に配置しない
                  </p>
                </div>
                <Switch
                  checked={detailConditions.noConsecutive}
                  onCheckedChange={(checked: boolean) =>
                    setDetailConditions(prev => ({ ...prev, noConsecutive: checked }))
                  }
                />
              </div>

              <div className='space-y-3'>
                <Label>合同授業設定</Label>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder='科目を選択' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='math'>数学</SelectItem>
                      <SelectItem value='english'>英語</SelectItem>
                      <SelectItem value='science'>理科</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder='学年を選択' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='1'>1年生</SelectItem>
                      <SelectItem value='2'>2年生</SelectItem>
                      <SelectItem value='3'>3年生</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder='クラス数' type='number' />
                </div>
              </div>

              <Separator />

              <div className='space-y-3'>
                <Label>授業時間設定</Label>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <Label htmlFor='daily-periods' className='text-sm'>
                      1日の授業数
                    </Label>
                    <Input id='daily-periods' type='number' defaultValue='6' className='mt-1' />
                  </div>
                  <div>
                    <Label htmlFor='saturday-periods' className='text-sm'>
                      土曜の授業数
                    </Label>
                    <Input id='saturday-periods' type='number' defaultValue='4' className='mt-1' />
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor='custom-conditions'>任意条件</Label>
                <Textarea
                  id='custom-conditions'
                  placeholder='その他の特別な条件があれば記入してください...'
                  value={detailConditions.customConditions}
                  onChange={e =>
                    setDetailConditions(prev => ({ ...prev, customConditions: e.target.value }))
                  }
                  rows={3}
                  className='mt-2'
                />
              </div>
            </div>
          </div>

          <div className='flex justify-end space-x-4 pt-4'>
            <Button variant='outline' disabled={isGeneratingProgram}>
              条件をリセット
            </Button>

            <Button
              onClick={handleGenerate}
              size='lg'
              className='px-8'
              disabled={isGeneratingProgram}
            >
              {isGeneratingProgram ? (
                <>
                  <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                  時間割生成中...
                </>
              ) : (
                <>
                  <Settings className='w-4 h-4 mr-2' />
                  時間割を生成
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 生成結果表示 */}
      {generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <CheckCircle className='w-5 h-5 text-green-500' />
              <span>時間割生成完了</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>生成時間</p>
                  <p className='text-2xl font-bold'>
                    {generationResult.data?.metadata?.statistics?.generationTime || '不明'}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>割当数</p>
                  <p className='text-2xl font-bold'>
                    {generationResult.data?.metadata?.statistics?.totalAssignments || 0}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>制約違反</p>
                  <p className='text-2xl font-bold'>
                    {generationResult.data?.metadata?.statistics?.constraintViolations || 0}
                  </p>
                </div>
              </div>

              <div className='bg-green-50 p-4 rounded-lg'>
                <p className='text-sm text-green-800'>
                  <strong>時間割ID:</strong> {generationResult.data?.id}
                </p>
                <p className='text-sm text-green-800'>
                  <strong>生成日時:</strong>{' '}
                  {new Date(generationResult.data?.created_at || Date.now()).toLocaleString(
                    'ja-JP'
                  )}
                </p>
                <p className='text-sm text-green-800 mt-2'>
                  時間割が正常に生成されました。「時間割参照」画面で詳細を確認できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
