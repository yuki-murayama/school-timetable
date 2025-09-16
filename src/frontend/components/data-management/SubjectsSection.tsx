import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import type { Subject } from '@shared/schemas'
import { Edit, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { subjectApi } from '../../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { SortableRow } from './SortableRow'
import { SubjectEditDialog } from './SubjectEditDialog'

interface SubjectsSectionProps {
  subjects: Subject[]
  onSubjectsUpdate: (subjects: Subject[]) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
  isLoading: boolean
}

/**
 * フォームデータをAPI送信形式に変換
 * フロントエンドフォーム形式 → バックエンドAPI期待形式
 */
function convertSubjectFormDataToApi(subjectData: Partial<Subject>): any {
  const apiData: any = {
    name: subjectData.name || '',
    school_id: 'default', // 必須フィールド
  }

  // 対象学年の変換：配列 → JSON文字列
  const grades = subjectData.grades || subjectData.targetGrades || subjectData.target_grades
  if (grades && Array.isArray(grades) && grades.length > 0) {
    apiData.target_grades = JSON.stringify(grades)
  }

  // 週間授業数の変換：オブジェクト または 数値
  const weeklyHours = subjectData.weeklyHours || subjectData.weekly_hours
  if (weeklyHours) {
    if (typeof weeklyHours === 'number') {
      apiData.weekly_hours = weeklyHours
    } else if (typeof weeklyHours === 'object') {
      // オブジェクト形式の場合、最初の値を使用（編集用に単純化）
      const hours = Object.values(weeklyHours)
      if (hours.length > 0 && typeof hours[0] === 'number') {
        apiData.weekly_hours = hours[0]
      }
    }
  }

  // 特別教室の変換
  const specialClassroom = subjectData.specialClassroom || subjectData.special_classroom
  if (specialClassroom && specialClassroom.trim()) {
    apiData.special_classroom = specialClassroom.trim()
  }

  console.log('🔧 convertSubjectFormDataToApi:', {
    入力: subjectData,
    出力: apiData,
  })

  return apiData
}

export function SubjectsSection({
  subjects,
  onSubjectsUpdate,
  token,
  getFreshToken,
  isLoading,
}: SubjectsSectionProps) {
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [isSubjectsSaving, setIsSubjectsSaving] = useState(false)

  // Debounce ref for order updates
  const orderUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Helper function to format target grades for display
  const formatGrades = (subject: Subject) => {
    // 統一型定義のgradesフィールドを優先し、フォールバックでtargetGradesを使用
    const grades = subject.grades || subject.targetGrades || subject.target_grades || []

    // Ensure we have a valid array
    if (!Array.isArray(grades) || grades.length === 0) {
      return '全学年'
    }

    // Double check that we can safely map over the array
    try {
      return grades.map(grade => `${grade}年`).join(', ')
    } catch (error) {
      console.error('Error in formatGrades:', error, 'grades:', grades, 'subject:', subject)
      return '全学年'
    }
  }
  // Helper function to format weekly hours for display
  const formatWeeklyHours = (subject: Subject) => {
    // 統一型定義のweeklyHoursオブジェクト形式を優先
    if (subject.weeklyHours && typeof subject.weeklyHours === 'object') {
      // オブジェクトから値を取得（表示用に最初の値を使用）
      const hours = Object.values(subject.weeklyHours)
      if (hours.length > 0 && typeof hours[0] === 'number') {
        return hours[0]
      }
    }
    
    // フォールバック: weekly_hours数値
    if (typeof subject.weekly_hours === 'number') {
      return subject.weekly_hours
    }
    
    // デフォルト
    return 1
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (orderUpdateTimeoutRef.current) {
        clearTimeout(orderUpdateTimeoutRef.current)
      }
    }
  }, [])

  const handleAddSubject = () => {
    console.log('🎯 handleAddSubject called')
    setEditingSubject(null)
    setIsSubjectDialogOpen(true)
  }

  const handleEditSubject = (subject: Subject) => {
    setEditingSubject(subject)
    setIsSubjectDialogOpen(true)
  }

  const handleDeleteSubject = async (id: string) => {
    if (!token) return

    console.log('🗑️ 統一型安全APIで教科削除開始:', id)

    try {
      const result = await subjectApi.deleteSubject(id, { token, getFreshToken })
      console.log('✅ 教科削除成功:', result)

      // 削除成功時にリストから除外
      onSubjectsUpdate(subjects.filter(s => s.id !== id))
      toast({
        title: '削除完了',
        description: '教科情報を削除しました',
      })
    } catch (error: unknown) {
      console.error('❌ 教科削除エラー:', error)

      toast({
        title: '削除エラー',
        description: '教科の削除に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const handleSaveSubject = useCallback(async (subjectData: Partial<Subject>) => {
    // 🔧 修正: SubjectEditDialog内で既にAPI呼び出しが完了しているため、
    // ここではUI状態の更新のみを行う（重複API呼び出しを防止）
    
    console.log('🔄 [SubjectsSection] 教科保存完了コールバック:', {
      subjectData,
      editingSubject: editingSubject?.id,
      timestamp: new Date().toISOString()
    })

    try {
      if (editingSubject?.id && subjectData.id) {
        // Update: 既存の教科をリストで更新
        console.log('🔄 更新モード: 既存教科を更新します')
        
        onSubjectsUpdate(prevSubjects => {
          console.log('📋 [handleSaveSubject] 既存教科更新実行:', {
            prevCount: prevSubjects.length,
            targetId: editingSubject.id,
            prevIds: prevSubjects.map(s => s.id)
          })
          
          const updatedSubjects = prevSubjects.map(s => {
            if (s.id === editingSubject.id) {
              console.log('🔄 UI更新: 既存教科を置換:', s.id, '→', subjectData.name)
              return { ...s, ...subjectData } as Subject
            }
            return s
          })
          
          console.log('✅ 既存教科更新完了:', {
            after: updatedSubjects.length,
            updatedId: subjectData.id
          })
          
          return updatedSubjects
        })
      } else {
        // Create: 新しい教科をリストに追加
        console.log('➕ 追加モード: 新規教科をリストに追加します:', {
          subjectData,
          hasId: !!subjectData.id
        })
        
        if (subjectData.id) {
          // 即座にUI状態を更新
          onSubjectsUpdate(prevSubjects => {
            console.log('📋 [handleSaveSubject] 新規教科追加実行:', {
              prevCount: prevSubjects.length,
              prevIds: prevSubjects.map(s => s.id),
              newId: subjectData.id,
              newName: subjectData.name
            })
            
            const newSubjects = [...prevSubjects, subjectData as Subject]
            
            console.log('✅ 新規教科追加完了:', {
              after: newSubjects.length,
              newIds: newSubjects.map(s => s.id)
            })
            
            return newSubjects
          })
          
          // さらに確実性を高めるため、APIから最新データを再取得
          console.log('🔄 [追加確認] APIから最新教科一覧を再取得します')
          setTimeout(async () => {
            if (token) {
              try {
                const latestSubjects = await subjectApi.getSubjects({ token, getFreshToken })
                console.log('✅ [追加確認] 最新教科データ取得成功:', {
                  count: latestSubjects.subjects?.length || 0,
                  hasNewSubject: latestSubjects.subjects?.some(s => s.id === subjectData.id)
                })
                
                if (latestSubjects.subjects) {
                  onSubjectsUpdate(latestSubjects.subjects)
                }
              } catch (error) {
                console.error('⚠️ [追加確認] 最新データ取得失敗:', error)
              }
            }
          }, 500) // 500ms後に再取得
        } else {
          console.error('❌ 新規教科にIDが含まれていません:', subjectData)
          throw new Error('新規教科データにIDが含まれていません')
        }
      }
      
      // ダイアログを閉じる
      setIsSubjectDialogOpen(false)
      setEditingSubject(null)
    } catch (error) {
      console.error('❌ UI更新エラー:', error)
      
      toast({
        title: 'UI更新エラー',
        description: 'リストの更新に失敗しました',
        variant: 'destructive',
      })
    }
  }, [editingSubject?.id, onSubjectsUpdate, toast])

  const handleSaveAllSubjects = async () => {
    if (!token) return

    setIsSubjectsSaving(true)
    try {
      console.log('💾 統一型安全APIで教科一括保存開始:', subjects.length, '件')

      // 各教科を個別に作成/更新（一括更新APIがない場合）
      const updatePromises = subjects.map(async subject => {
        // APIクライアント用にデータを正規化（不要なフィールドを除去）
        const normalizedData: any = {
          name: subject.name,
          school_id: 'default', // 必須フィールド
        }

        // オプショナルフィールドはnullでない場合のみ追加
        const weeklyHours = subject.weekly_hours || (subject as any).weeklyHours
        if (weeklyHours && weeklyHours !== 1) {
          normalizedData.weekly_hours = weeklyHours
        }

        const targetGrades = subject.target_grades || (subject.targetGrades ? JSON.stringify(subject.targetGrades) : null)
        if (targetGrades && targetGrades !== 'null') {
          normalizedData.target_grades = targetGrades
        }

        const specialClassroom = subject.special_classroom || subject.specialClassroom
        if (specialClassroom && specialClassroom.trim && specialClassroom.trim()) {
          normalizedData.special_classroom = specialClassroom
        }

        if (subject.id) {
          // 既存教科の更新
          console.log('🔄 既存教科更新:', subject.id, subject.name, '正規化データ:', normalizedData)
          return await subjectApi.updateSubject(subject.id, normalizedData, { token, getFreshToken })
        } else {
          // 新規教科の作成
          console.log('➕ 新規教科作成:', subject.name, '正規化データ:', normalizedData)
          const result = await subjectApi.createSubject(normalizedData, { token, getFreshToken })
          console.log('✅ 新規教科作成成功:', result)
          return result
        }
      })

      const results = await Promise.allSettled(updatePromises)
      const successCount = results.filter(r => r.status === 'fulfilled').length
      const failCount = results.filter(r => r.status === 'rejected').length

      console.log(`✅ 教科一括保存完了: 成功 ${successCount}件, 失敗 ${failCount}件`)

      if (failCount === 0) {
        toast({
          title: '保存完了',
          description: `全ての教科情報を保存しました（${successCount}件）`,
        })
      } else {
        toast({
          title: '部分的に保存完了',
          description: `${successCount}件保存、${failCount}件失敗`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('❌ 教科一括保存エラー:', error)
      toast({
        title: '保存エラー',
        description: '教科情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSubjectsSaving(false)
    }
  }

  // Drag and drop handler
  const handleSubjectDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = subjects.findIndex(item => item.id === active.id)
      const newIndex = subjects.findIndex(item => item.id === over?.id)

      const newItems = arrayMove(subjects, oldIndex, newIndex)

      // Update order fields and save to backend
      const itemsWithOrder = newItems.map((item, index) => ({
        ...item,
        order: index,
        target_grades: item.targetGrades || [],
        targetGrades: item.targetGrades || [],
      }))

      // 即座にUI更新
      onSubjectsUpdate(itemsWithOrder)

      // Save order changes to backend using batch update API with debounce
      if (token) {
        // Clear existing timeout
        if (orderUpdateTimeoutRef.current) {
          clearTimeout(orderUpdateTimeoutRef.current)
        }

        // Set new timeout for debounced update
        orderUpdateTimeoutRef.current = setTimeout(async () => {
          try {
            console.log('🔄 教科順序更新開始:', itemsWithOrder.length, '件')

            // Update each subject with new order via API
            const updatePromises = itemsWithOrder.map(async (subject, index) => {
              if (!subject.id) throw new Error('Subject ID is required')
              
              // APIクライアント用にデータを正規化（不要なフィールドを除去）
              const normalizedData: any = {
                name: subject.name,
                school_id: 'default', // 必須フィールド
                order: index,
              }

              // オプショナルフィールドはnullでない場合のみ追加
              const weeklyHours = subject.weekly_hours || (subject as any).weeklyHours
              if (weeklyHours && weeklyHours !== 1) {
                normalizedData.weekly_hours = weeklyHours
              }

              const targetGrades = subject.target_grades || (subject.targetGrades ? JSON.stringify(subject.targetGrades) : null)
              if (targetGrades && targetGrades !== 'null') {
                normalizedData.target_grades = targetGrades
              }

              const specialClassroom = subject.special_classroom || subject.specialClassroom
              if (specialClassroom && specialClassroom.trim && specialClassroom.trim()) {
                normalizedData.special_classroom = specialClassroom
              }

              return await subjectApi.updateSubject(subject.id, normalizedData, { token })
            })

            await Promise.all(updatePromises)

            console.log('✅ 教科順序更新完了')
            toast({
              title: '順序変更',
              description: '教科の順序を変更し、保存しました',
            })
          } catch (error) {
            console.error('❌ 教科順序更新エラー:', error)
            toast({
              title: '順序変更エラー',
              description: '教科順序の保存に失敗しました',
              variant: 'destructive',
            })
          }
        }, 500) // 500ms後に実行（デバウンス）
      }
    }
  }

  // Component error boundary
  try {
    return (
      <>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between'>
            <div>
              <CardTitle>教科情報管理</CardTitle>
              <CardDescription>教科名と専用教室の紐づけを管理します</CardDescription>
            </div>
            <Button
              onClick={handleAddSubject}
              disabled={isLoading}
              data-testid='add-subject-button'
            >
              <Plus className='w-4 h-4 mr-2' />
              教科を追加
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className='flex flex-col items-center justify-center p-8 space-y-4'>
                <Loader2 className='w-8 h-8 animate-spin' />
                <div className='text-center'>
                  <div className='text-sm font-medium'>教科情報を読み込み中...</div>
                  <div className='text-xs text-gray-500 mt-1'>
                    しばらく時間がかかる場合があります。
                  </div>
                </div>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleSubjectDragEnd}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className='w-8'></TableHead>
                      <TableHead>教科名</TableHead>
                      <TableHead>対象学年</TableHead>
                      <TableHead>専用教室</TableHead>
                      <TableHead>1週間の授業数</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!Array.isArray(subjects) || subjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className='text-center text-gray-500 py-8'>
                          {!Array.isArray(subjects)
                            ? '教科情報の読み込み中にエラーが発生しました'
                            : '教科情報が登録されていません'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      <SortableContext
                        items={subjects.map(s => s?.id || '')}
                        strategy={verticalListSortingStrategy}
                      >
                        {subjects.map(subject => (
                          <SortableRow key={subject.id} id={subject.id || ''}>
                            <TableCell className='font-medium'>{subject.name}</TableCell>
                            <TableCell>
                              <Badge variant='secondary'>{formatGrades(subject)}</Badge>
                            </TableCell>
                            <TableCell>
                              {subject.specialClassroom ? (
                                <Badge variant='outline'>{subject.specialClassroom}</Badge>
                              ) : (
                                <span className='text-gray-400'>なし</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className='text-sm font-semibold'>
                                週{formatWeeklyHours(subject)}回
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className='flex space-x-2'>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => handleEditSubject(subject)}
                                  aria-label={`教科「${subject.name}」を編集`}
                                  data-testid={`edit-subject-${subject.id}`}
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => handleDeleteSubject(subject.id)}
                                  className='text-red-600 hover:text-red-700 hover:bg-red-50'
                                  aria-label={`教科「${subject.name}」を削除`}
                                  data-testid={`delete-subject-${subject.id}`}
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              </div>
                            </TableCell>
                          </SortableRow>
                        ))}
                      </SortableContext>
                    )}
                  </TableBody>
                </Table>
              </DndContext>
            )}

            {subjects.length > 0 && (
              <div className='mt-4 flex justify-end'>
                <Button
                  onClick={handleSaveAllSubjects}
                  disabled={isSubjectsSaving || isLoading}
                  variant='outline'
                >
                  {isSubjectsSaving ? (
                    <>
                      <Loader2 className='w-4 h-4 mr-2 animate-spin' />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className='w-4 h-4 mr-2' />
                      すべて保存
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <SubjectEditDialog
          subject={editingSubject}
          isOpen={isSubjectDialogOpen}
          onClose={() => {
            setIsSubjectDialogOpen(false)
            setEditingSubject(null)
          }}
          onSave={handleSaveSubject}
          token={token}
          getFreshToken={getFreshToken}
        />
      </>
    )
  } catch (error) {
    console.error('SubjectsSection render error:', error)
    return (
      <div className='p-4 border rounded-md bg-red-50 border-red-200'>
        <h3 className='text-red-800 font-semibold'>教科情報の表示エラー</h3>
        <p className='text-red-600 text-sm mt-1'>教科情報コンポーネントでエラーが発生しました。</p>
      </div>
    )
  }
}
