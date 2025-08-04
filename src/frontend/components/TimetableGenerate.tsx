import { CheckCircle, Loader2, Settings, Wand2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../hooks/use-auth'
import { useTimetableGeneration } from '../hooks/use-timetable-generation'
import { useToast } from '../hooks/use-toast'
import { type TimetableGenerationResponse, timetableApi } from '../lib/api'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { GenerationControls } from './ui/generation-controls'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { ProgressDisplay } from './ui/progress-display'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Separator } from './ui/separator'
import { Switch } from './ui/switch'
import { Textarea } from './ui/textarea'

export function TimetableGenerate() {
  const { token } = useAuth()
  const { toast } = useToast()

  const [isDetailMode, setIsDetailMode] = useState(false)
  const [simpleCondition, setSimpleCondition] = useState('')
  const [detailConditions, setDetailConditions] = useState({
    noConsecutive: true,
    jointClasses: '',
    customConditions: '',
  })

  // 段階的時間割生成の状態管理
  const { isGenerating, progress, error, finalTimetableId, startGeneration, stopGeneration } =
    useTimetableGeneration(token || undefined)

  // 従来の一括生成のための状態管理（フォールバック用）
  const [generationResult, setGenerationResult] = useState<TimetableGenerationResponse | null>(null)
  const [useLegacyGeneration, setUseLegacyGeneration] = useState(false)

  // 生成方式選択
  const [generationMethod, setGenerationMethod] = useState<'ai' | 'program'>('program')
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

    if (generationMethod === 'program') {
      // プログラム型生成を実行
      await handleProgramGenerate()
    } else if (useLegacyGeneration) {
      // 従来の一括生成を実行
      await handleLegacyGenerate()
    } else {
      // 新しい段階的生成を実行
      await startGeneration()
    }
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

  const handleLegacyGenerate = async () => {
    setGenerationResult(null)

    try {
      console.log('従来の時間割生成開始...')

      // 生成オプションを準備
      const options: Record<string, string | boolean> = {}

      if (isDetailMode) {
        options.noConsecutive = detailConditions.noConsecutive
        options.customConditions = detailConditions.customConditions
      } else {
        options.simpleCondition = simpleCondition
      }

      console.log('送信するリクエストデータ:', { options })

      const result = await timetableApi.generateTimetable(
        { options },
        { token: token || undefined }
      )

      setGenerationResult(result)
      toast({
        title: '生成完了',
        description: '時間割が正常に生成されました',
      })

      console.log('時間割生成完了:', result)
    } catch (error) {
      console.error('時間割生成エラー:', error)

      const errorMessage = error instanceof Error ? error.message : '時間割生成に失敗しました'

      toast({
        title: '生成エラー',
        description: errorMessage,
        variant: 'destructive',
      })
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
                <Wand2 className='w-5 h-5' />
                <span>生成モード</span>
              </CardTitle>
              <CardDescription>簡易モードまたは詳細モードを選択してください</CardDescription>
            </div>
            <div className='flex items-center space-x-4'>
              <div className='flex items-center space-x-2'>
                <Label htmlFor='legacy-toggle' className='text-xs text-orange-600'>
                  従来版（一括）
                </Label>
                <Switch
                  id='legacy-toggle'
                  checked={useLegacyGeneration}
                  onCheckedChange={setUseLegacyGeneration}
                />
              </div>
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
          {/* 生成方式選択 */}
          <div className='space-y-4'>
            <h3 className='text-lg font-semibold flex items-center space-x-2'>
              <Settings className='w-5 h-5' />
              <span>生成方式選択</span>
            </h3>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <Card
                className={`cursor-pointer transition-colors ${
                  generationMethod === 'program'
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setGenerationMethod('program')}
              >
                <CardContent className='p-4'>
                  <div className='flex items-start space-x-3'>
                    <input
                      type='radio'
                      checked={generationMethod === 'program'}
                      onChange={() => setGenerationMethod('program')}
                      className='mt-1'
                    />
                    <div>
                      <h4 className='font-semibold'>プログラム型生成</h4>
                      <p className='text-sm text-gray-600 mt-1'>
                        バックトラッキング法による高速・確実な時間割生成
                      </p>
                      <ul className='text-xs text-gray-500 mt-2 list-disc list-inside'>
                        <li>割当制限（必須・推奨）対応</li>
                        <li>制約チェック自動実行</li>
                        <li>高速処理（数秒〜数分）</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card
                className={`cursor-pointer transition-colors ${
                  generationMethod === 'ai'
                    ? 'ring-2 ring-green-500 bg-green-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setGenerationMethod('ai')}
              >
                <CardContent className='p-4'>
                  <div className='flex items-start space-x-3'>
                    <input
                      type='radio'
                      checked={generationMethod === 'ai'}
                      onChange={() => setGenerationMethod('ai')}
                      className='mt-1'
                    />
                    <div>
                      <h4 className='font-semibold'>AI生成</h4>
                      <p className='text-sm text-gray-600 mt-1'>人工知能による柔軟な時間割生成</p>
                      <ul className='text-xs text-gray-500 mt-2 list-disc list-inside'>
                        <li>自然言語条件対応</li>
                        <li>複雑な要求理解</li>
                        <li>段階的生成可能</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {generationMethod === 'ai' && !isDetailMode ? (
            <div className='space-y-4'>
              <div>
                <Label htmlFor='simple-condition'>生成条件</Label>
                <Textarea
                  id='simple-condition'
                  placeholder='例：数学は午前中に配置、体育は連続2時間で設定...'
                  value={simpleCondition}
                  onChange={e => setSimpleCondition(e.target.value)}
                  rows={4}
                  className='mt-2'
                />
              </div>
            </div>
          ) : (
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
                      <Input
                        id='saturday-periods'
                        type='number'
                        defaultValue='4'
                        className='mt-1'
                      />
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
          )}

          <div className='flex justify-end space-x-4 pt-4'>
            <Button variant='outline' disabled={isGenerating || isGeneratingProgram}>
              条件をリセット
            </Button>

            {generationMethod === 'program' ? (
              <Button
                onClick={handleGenerate}
                size='lg'
                className='px-8'
                disabled={isGeneratingProgram}
              >
                {isGeneratingProgram ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    プログラム生成中...
                  </>
                ) : (
                  <>
                    <Settings className='w-4 h-4 mr-2' />
                    プログラム型生成実行
                  </>
                )}
              </Button>
            ) : useLegacyGeneration ? (
              <Button onClick={handleGenerate} size='lg' className='px-8' disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                    生成中...
                  </>
                ) : (
                  <>
                    <Wand2 className='w-4 h-4 mr-2' />
                    時間割を生成（従来版）
                  </>
                )}
              </Button>
            ) : (
              <GenerationControls
                onStart={handleGenerate}
                onStop={stopGeneration}
                isGenerating={isGenerating}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* 段階的生成の進捗表示 */}
      {!useLegacyGeneration && isGenerating && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <Loader2 className='w-5 h-5 animate-spin text-blue-500' />
              <span>段階的生成中</span>
            </CardTitle>
            <CardDescription>
              時間割を段階的に生成しています。3-5分程度かかる場合があります。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressDisplay progress={progress} error={error} />
          </CardContent>
        </Card>
      )}

      {/* 段階的生成の完了表示 */}
      {!useLegacyGeneration && !isGenerating && finalTimetableId && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <CheckCircle className='w-5 h-5 text-green-500' />
              <span>段階的生成完了</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='bg-green-50 p-4 rounded-lg'>
              <p className='text-sm text-green-800'>
                <strong>時間割ID:</strong> {finalTimetableId}
              </p>
              <p className='text-sm text-green-800'>
                <strong>生成日時:</strong> {new Date().toLocaleString('ja-JP')}
              </p>
              <p className='text-sm text-green-800 mt-2'>
                時間割が正常に生成されました。「時間割参照」画面で詳細を確認できます。
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* プログラム型生成の結果表示 */}
      {generationMethod === 'program' && generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <CheckCircle className='w-5 h-5 text-green-500' />
              <span>プログラム型生成完了</span>
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
                  プログラム型時間割が正常に生成されました。「時間割参照」画面で詳細を確認できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 従来版生成の結果表示 */}
      {useLegacyGeneration && generationResult && (
        <Card>
          <CardHeader>
            <CardTitle className='flex items-center space-x-2'>
              <CheckCircle className='w-5 h-5 text-green-500' />
              <span>生成完了（従来版）</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>教師数</p>
                  <p className='text-2xl font-bold'>
                    {generationResult.metadata.dataUsed.teachersCount}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>教科数</p>
                  <p className='text-2xl font-bold'>
                    {generationResult.metadata.dataUsed.subjectsCount}
                  </p>
                </div>
                <div className='text-center'>
                  <p className='text-sm text-muted-foreground'>教室数</p>
                  <p className='text-2xl font-bold'>
                    {generationResult.metadata.dataUsed.classroomsCount}
                  </p>
                </div>
              </div>

              <div className='bg-green-50 p-4 rounded-lg'>
                <p className='text-sm text-green-800'>
                  <strong>時間割ID:</strong> {generationResult.timetable.id}
                </p>
                <p className='text-sm text-green-800'>
                  <strong>生成日時:</strong>{' '}
                  {new Date(generationResult.timetable.createdAt).toLocaleString('ja-JP')}
                </p>
                <p className='text-sm text-green-800 mt-2'>
                  時間割が正常に生成されました。「時間割参照」画面で詳細を確認できます。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 従来版生成中の進行状況 */}
      {useLegacyGeneration && isGenerating && (
        <Card>
          <CardContent className='pt-6'>
            <div className='flex items-center justify-center space-x-4'>
              <Loader2 className='w-6 h-6 animate-spin text-blue-500' />
              <div>
                <p className='text-sm font-medium'>時間割を生成中...（従来版）</p>
                <p className='text-xs text-muted-foreground'>
                  この処理には10-30秒かかる場合があります
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
