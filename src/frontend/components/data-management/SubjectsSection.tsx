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
import { Edit, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { type Subject, subjectApi } from '../../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { SortableRow } from './SortableRow'
import { SubjectEditDialog } from './SubjectEditDialog'

interface SubjectsSectionProps {
  token: string | null
  getFreshToken?: () => Promise<string | null>
}

export function SubjectsSection({ token, getFreshToken }: SubjectsSectionProps) {
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false)
  const [isSubjectsLoading, setIsSubjectsLoading] = useState(true)
  const [isSubjectsSaving, setIsSubjectsSaving] = useState(false)

  // Debounce ref for order updates
  const orderUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  // Flag to prevent infinite useEffect loops
  const hasLoadedRef = useRef(false)

  // Removed debug logging to fix infinite rendering

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

  // 教科読み込み関数をメモ化
  const loadSubjects = useCallback(async () => {
    // loadSubjects called

    if (!token) {
      // No token available
      setIsSubjectsLoading(false)
      return
    }

    if (hasLoadedRef.current) {
      // Already loaded, skipping
      return
    }

    hasLoadedRef.current = true

    setIsSubjectsLoading(true)
    // Starting subjects data load

    // タイムアウト機能を追加
    const timeoutId = setTimeout(() => {
      console.warn('Subjects loading timeout - forcing loading to false')
      setIsSubjectsLoading(false)
      setSubjects([])
      // Remove toast from timeout to prevent infinite loop
    }, 15000) // 15秒でタイムアウト

    try {
      // Calling subjectApi.getSubjects

      let subjectsData: Subject[]
      try {
        subjectsData = await subjectApi.getSubjects({ token, getFreshToken })
        // API response received
      } catch (apiError) {
        console.error('API call failed:', apiError)
        throw apiError
      }

      // Processing subjects response

      // Ensure we always have an array
      let subjects = Array.isArray(subjectsData) ? subjectsData : []
      // Subjects array processed

      // Double check and force array if needed
      if (!Array.isArray(subjects)) {
        console.warn('Subjects is not an array, forcing to empty array:', subjects)
        subjects = []
      }

      // Final subjects array prepared

      // Normalize subject data (parse targetGrades if it's a JSON string)
      // Extra safety check before map
      if (!Array.isArray(subjects)) {
        console.error('Subjects is not an array after all checks, aborting:', subjects)
        setSubjects([])
        setIsSubjectsLoading(false)
        clearTimeout(timeoutId)
        return
      }

      const normalizedSubjects = subjects.map(subject => {
        let targetGrades = []

        if (Array.isArray(subject.targetGrades)) {
          targetGrades = subject.targetGrades
        } else if (typeof subject.targetGrades === 'string') {
          try {
            targetGrades = JSON.parse(subject.targetGrades || '[]')
          } catch (_e) {
            console.warn('Failed to parse subject targetGrades:', subject.targetGrades)
            targetGrades = []
          }
        }

        return {
          ...subject,
          targetGrades,
        }
      })

      // Sort by order field, then by name if no order
      const sortedSubjects = normalizedSubjects.sort((a, b) => {
        if (a.order != null && b.order != null) {
          return a.order - b.order
        }
        if (a.order != null) return -1
        if (b.order != null) return 1
        return a.name.localeCompare(b.name)
      })

      // Final safety check before setting state
      if (Array.isArray(sortedSubjects)) {
        // Setting subjects state
        setSubjects(sortedSubjects)
      } else {
        console.error('❌ sortedSubjects is not an array, setting empty array:', sortedSubjects)
        setSubjects([])
      }

      // 成功時にタイムアウトをクリア
      clearTimeout(timeoutId)
    } catch (error) {
      clearTimeout(timeoutId)
      hasLoadedRef.current = false // Reset to allow retry on error

      console.error('Error loading subjects:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))

      // エラー時は空配列をセット
      setSubjects([])

      // Remove toast from error handler to prevent infinite loop - log error instead
      console.error(
        '教科情報の読み込みに失敗しました:',
        error instanceof Error ? error.message : 'Unknown error'
      )
    } finally {
      // Setting loading to false
      setIsSubjectsLoading(false)
    }
  }, [token, getFreshToken]) // 必要な依存関係を全て含めてメモ化

  // Load subjects useEffect
  useEffect(() => {
    loadSubjects()
  }, [loadSubjects]) // loadSubjectsを依存関係に含める

  // Loading state monitoring removed to prevent infinite renders

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

    console.log('Attempting to delete subject with ID:', id)

    try {
      await subjectApi.deleteSubject(id, { token, getFreshToken })

      // 削除成功時にリストから除外
      setSubjects(subjects.filter(s => s.id !== id))
      toast({
        title: '削除完了',
        description: '教科情報を削除しました',
      })
    } catch (error: unknown) {
      console.error('Subject deletion error:', error)

      // 404エラーの場合は既に削除済みとして処理
      if (error?.message?.includes('404') || error?.response?.status === 404) {
        console.log('Subject already deleted (404), removing from list')
        setSubjects(prevSubjects =>
          (Array.isArray(prevSubjects) ? prevSubjects : []).filter(s => s.id !== id)
        )
        toast({
          title: '削除完了',
          description: '教科情報は既に削除されています',
        })
      } else {
        toast({
          title: '削除エラー',
          description: '教科情報の削除に失敗しました',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSaveSubject = async (subjectData: Partial<Subject>) => {
    if (!token) return

    try {
      if (editingSubject?.id) {
        // Update
        console.log('🔄 Updating subject with data:', subjectData)
        const updatedSubject = await subjectApi.updateSubject(editingSubject.id, subjectData, {
          token,
          getFreshToken,
        })
        console.log(
          '✅ API returned updated subject:',
          updatedSubject,
          'targetGrades:',
          updatedSubject.targetGrades
        )

        setSubjects(prevSubjects => {
          const newSubjectsList = (Array.isArray(prevSubjects) ? prevSubjects : []).map(s => {
            if (s.id === editingSubject.id) {
              console.log(
                '🔄 Replacing subject:',
                s.id,
                'old targetGrades:',
                s.targetGrades,
                'new targetGrades:',
                updatedSubject.targetGrades
              )
              return updatedSubject
            }
            return s
          })
          console.log(
            '📊 Updated subjects list:',
            newSubjectsList.map(s => ({ id: s.id, name: s.name, targetGrades: s.targetGrades }))
          )
          return newSubjectsList
        })

        toast({
          title: '更新完了',
          description: '教科情報を更新しました',
        })
      } else {
        // Create new
        const newSubject = await subjectApi.createSubject(subjectData, { token, getFreshToken })
        console.log(
          '✅ API returned new subject:',
          newSubject,
          'targetGrades:',
          newSubject.targetGrades
        )
        setSubjects(prevSubjects => [
          ...(Array.isArray(prevSubjects) ? prevSubjects : []),
          newSubject,
        ])
        toast({
          title: '追加完了',
          description: '教科情報を追加しました',
        })
      }
      setIsSubjectDialogOpen(false)
      setEditingSubject(null)
    } catch (error) {
      console.error('教科保存エラー:', error)
      toast({
        title: '保存エラー',
        description: '教科情報の保存に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const handleSaveAllSubjects = async () => {
    if (!token) return

    setIsSubjectsSaving(true)
    try {
      // Normalize all subjects data before sending
      const normalizedSubjects = (Array.isArray(subjects) ? subjects : []).map(subject => ({
        ...subject,
        target_grades: subject.targetGrades || [],
        targetGrades: subject.targetGrades || [],
      }))

      await subjectApi.saveSubjects(normalizedSubjects, { token, getFreshToken })
      toast({
        title: '保存完了',
        description: '全ての教科情報を保存しました',
      })
    } catch (error) {
      console.error('教科一括保存エラー:', error)
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
  const handleSubjectDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setSubjects(items => {
        const safeItems = Array.isArray(items) ? items : []
        const oldIndex = safeItems.findIndex(item => item.id === active.id)
        const newIndex = safeItems.findIndex(item => item.id === over?.id)

        const newItems = arrayMove(safeItems, oldIndex, newIndex)

        // Update order fields and save to backend
        const itemsWithOrder = newItems.map((item, index) => ({
          ...item,
          order: index,
          target_grades: item.targetGrades || [],
          targetGrades: item.targetGrades || [],
        }))

        // Save order changes to backend using batch update API with debounce
        if (token) {
          const orderData = itemsWithOrder.map(item => ({
            id: item.id,
            order: item.order,
          }))

          // Clear existing timeout
          if (orderUpdateTimeoutRef.current) {
            clearTimeout(orderUpdateTimeoutRef.current)
          }

          // Set new timeout for debounced update
          orderUpdateTimeoutRef.current = setTimeout(() => {
            subjectApi
              .reorderSubjects(orderData, { token, getFreshToken })
              .then(result => {
                console.log('✅ 教科順序一括更新完了:', result)
                toast({
                  title: '順序保存成功',
                  description: `${result.updatedCount}件の教科順序を更新しました`,
                })
              })
              .catch(error => {
                console.error('❌ Failed to save subject order:', error)
                toast({
                  title: '順序保存エラー',
                  description: '教科の順序保存に失敗しました',
                  variant: 'destructive',
                })
              })
          }, 500) // 500ms後に実行（デバウンス）
        }

        return itemsWithOrder
      })
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
              disabled={isSubjectsLoading}
              data-testid='add-subject-button'
            >
              <Plus className='w-4 h-4 mr-2' />
              教科を追加
            </Button>
          </CardHeader>
          <CardContent>
            {isSubjectsLoading ? (
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
                        items={(subjects || []).map(s => s?.id || '')}
                        strategy={verticalListSortingStrategy}
                      >
                        {(subjects || []).map(subject => (
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
                                週{subject.weekly_hours || 1}回
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className='flex space-x-2'>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => handleEditSubject(subject)}
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() => subject.id && handleDeleteSubject(subject.id)}
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

            <Button
              className='w-full mt-6'
              onClick={handleSaveAllSubjects}
              disabled={isSubjectsLoading || isSubjectsSaving}
            >
              {isSubjectsSaving ? (
                <Loader2 className='w-4 h-4 mr-2 animate-spin' />
              ) : (
                <Save className='w-4 h-4 mr-2' />
              )}
              {isSubjectsSaving ? '保存中...' : '教科情報を保存'}
            </Button>
          </CardContent>
        </Card>

        <SubjectEditDialog
          subject={editingSubject}
          isOpen={isSubjectDialogOpen}
          onClose={() => setIsSubjectDialogOpen(false)}
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
        <h3 className='text-red-800 font-semibold'>教科情報コンポーネントエラー</h3>
        <p className='text-red-600 text-sm mt-1'>教科情報の表示中にエラーが発生しました。</p>
        <p className='text-red-500 text-xs mt-2'>
          エラー詳細: {error instanceof Error ? error.message : 'Unknown error'}
        </p>
        <Button
          onClick={() => window.location.reload()}
          className='mt-3'
          variant='outline'
          size='sm'
        >
          ページを再読み込み
        </Button>
      </div>
    )
  }
}
