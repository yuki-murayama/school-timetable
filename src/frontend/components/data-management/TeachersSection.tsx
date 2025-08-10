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
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { type Teacher, teacherApi } from '../../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { SortableRow } from './SortableRow'
import { TeacherEditDialog } from './TeacherEditDialog'

interface TeachersSectionProps {
  teachers: Teacher[]
  onTeachersUpdate: (teachers: Teacher[]) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
  isLoading: boolean
}

export const TeachersSection = memo(function TeachersSection({
  teachers,
  onTeachersUpdate,
  token,
  getFreshToken,
  isLoading,
}: TeachersSectionProps) {
  const { toast } = useToast()
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // デバウンス用のタイムアウト参照
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Helper function to normalize a single teacher's data
  const _normalizeTeacher = (teacher: unknown): Teacher => {
    let subjects = []
    let grades = []

    // subjects の安全なパース
    if (Array.isArray(teacher.subjects)) {
      subjects = teacher.subjects
        .map(s => (typeof s === 'string' ? s : s && typeof s === 'object' && s.name ? s.name : s))
        .filter(s => typeof s === 'string')
    } else if (typeof teacher.subjects === 'string') {
      try {
        const parsed = JSON.parse(teacher.subjects || '[]')
        subjects = Array.isArray(parsed)
          ? parsed
              .map(s =>
                typeof s === 'string' ? s : s && typeof s === 'object' && s.name ? s.name : s
              )
              .filter(s => typeof s === 'string')
          : []
      } catch (_e) {
        console.warn('Failed to parse teacher subjects:', teacher.subjects)
        subjects = []
      }
    }

    // grades の安全なパース
    if (Array.isArray(teacher.grades)) {
      grades = teacher.grades.filter(g => typeof g === 'string')
    } else if (typeof teacher.grades === 'string') {
      try {
        const parsed = JSON.parse(teacher.grades || '[]')
        grades = Array.isArray(parsed) ? parsed.filter(g => typeof g === 'string') : []
      } catch (_e) {
        console.warn('Failed to parse teacher grades:', teacher.grades)
        grades = []
      }
    }

    return {
      ...teacher,
      subjects,
      grades,
    }
  }

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // メモ化されたハンドラー関数
  const handleAddTeacher = useCallback(() => {
    setEditingTeacher(null)
    setIsDialogOpen(true)
  }, [])

  const handleEditTeacher = useCallback((teacher: Teacher) => {
    setEditingTeacher(teacher)
    setIsDialogOpen(true)
  }, [])

  const handleDeleteTeacher = useCallback(
    async (id: string) => {
      if (!token || !Array.isArray(teachers)) return

      try {
        await teacherApi.deleteTeacher(id, { token, getFreshToken })
        onTeachersUpdate(teachers.filter(t => t.id !== id))
        toast({
          title: '削除完了',
          description: '教師情報を削除しました',
        })
      } catch (_error) {
        toast({
          title: '削除エラー',
          description: '教師情報の削除に失敗しました',
          variant: 'destructive',
        })
      }
    },
    [token, getFreshToken, teachers, onTeachersUpdate, toast] // Removed 'toast' to fix infinite loop
  )

  const handleSaveAllTeachers = useCallback(async () => {
    if (!token || !Array.isArray(teachers)) return

    setIsSaving(true)
    try {
      await teacherApi.saveTeachers(teachers, { token, getFreshToken })
      toast({
        title: '保存完了',
        description: '全ての教師情報を保存しました',
      })
    } catch (_error) {
      toast({
        title: '保存エラー',
        description: '教師情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [token, getFreshToken, teachers, toast])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (active.id !== over?.id && Array.isArray(teachers)) {
        const oldIndex = teachers.findIndex(item => item.id === active.id)
        const newIndex = teachers.findIndex(item => item.id === over?.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newItems = arrayMove(teachers, oldIndex, newIndex)

          // Update order fields
          const itemsWithOrder = newItems.map((item, index) => ({
            ...item,
            order: index,
          }))

          // 即座にUIを更新
          onTeachersUpdate(itemsWithOrder)

          // デバウンス処理: 既存のタイムアウトをクリア
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }

          // 500ms後に一括更新API呼び出し
          timeoutRef.current = setTimeout(async () => {
            if (token) {
              try {
                console.log('👨‍🏫 教師順序一括更新開始')
                const reorderData = itemsWithOrder
                  .map((teacher, index) => ({
                    id: teacher.id || '',
                    order: index,
                  }))
                  .filter(item => item.id)

                const result = await teacherApi.reorderTeachers(reorderData, {
                  token,
                  getFreshToken,
                })
                console.log('✅ 教師順序一括更新完了:', result)

                toast({
                  title: '順序保存完了',
                  description: `${result.updatedCount}件の教師順序を保存しました`,
                })
              } catch (error) {
                console.error('❌ Failed to save teacher order:', error)
                toast({
                  title: '順序保存エラー',
                  description: '教師の順序保存に失敗しました',
                  variant: 'destructive',
                })
              }
            }
          }, 500)
        }
      }
    },
    [teachers, onTeachersUpdate, token, getFreshToken, toast] // Removed 'toast' to fix infinite loop
  )

  // メモ化されたソート済み教師リスト
  const sortedTeachers = useMemo(() => {
    console.log('🔄 sortedTeachers recalculating, teachers:', teachers.length)
    if (!Array.isArray(teachers)) {
      console.warn('Teachers is not an array:', teachers)
      return []
    }
    const sorted = [...teachers].sort((a, b) => {
      if (a.order != null && b.order != null) {
        return a.order - b.order
      }
      if (a.order != null) return -1
      if (b.order != null) return 1
      return (a.name || '').localeCompare(b.name || '')
    })
    console.log('✅ sortedTeachers calculated:', sorted.length, 'teachers')
    return sorted
  }, [teachers])

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle>教師情報管理</CardTitle>
            <CardDescription>教師の担当科目と学年を管理します</CardDescription>
          </div>
          <Button onClick={handleAddTeacher} disabled={isLoading}>
            <Plus className='w-4 h-4 mr-2' />
            教師を追加
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center p-8'>
              <Loader2 className='w-6 h-6 animate-spin mr-2' />
              <span>読み込み中...</span>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-8'></TableHead>
                    <TableHead>教師名</TableHead>
                    <TableHead>担当科目</TableHead>
                    <TableHead>担当学年</TableHead>
                    <TableHead>割当制限</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!Array.isArray(teachers) || teachers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className='text-center text-gray-500 py-8'>
                        教師情報が登録されていません
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={sortedTeachers.map(t => t.id || '')}
                      strategy={verticalListSortingStrategy}
                    >
                      {sortedTeachers.map(teacher => {
                        try {
                          return (
                            <SortableRow key={teacher.id} id={teacher.id || ''}>
                              <TableCell className='font-medium'>{teacher.name}</TableCell>
                              <TableCell>
                                <div className='flex flex-wrap gap-1'>
                                  {(() => {
                                    try {
                                      const subjectsArray = teacher.subjects || []
                                      console.log(`🔍 Teacher ${teacher.name}:`, {
                                        subjects: subjectsArray,
                                        length: subjectsArray.length,
                                        type: typeof subjectsArray,
                                        isArray: Array.isArray(subjectsArray),
                                      })

                                      if (subjectsArray.length === 0) {
                                        console.log(`⚠️ ${teacher.name} has no subjects`)
                                        return (
                                          <span className='text-gray-400 text-xs'>科目なし</span>
                                        )
                                      }

                                      return subjectsArray.map(subject => {
                                        const subjectKey =
                                          typeof subject === 'string'
                                            ? subject
                                            : subject.name || Math.random().toString()
                                        return (
                                          <Badge key={subjectKey} variant='secondary'>
                                            {typeof subject === 'string' ? subject : subject.name}
                                          </Badge>
                                        )
                                      })
                                    } catch (error) {
                                      console.error(
                                        `Error rendering subjects for ${teacher.name}:`,
                                        error
                                      )
                                      return <span className='text-red-400 text-xs'>エラー</span>
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='flex flex-wrap gap-1'>
                                  {(() => {
                                    try {
                                      return (teacher.grades || []).map(grade => {
                                        const gradeKey =
                                          typeof grade === 'string'
                                            ? grade
                                            : grade.name || Math.random().toString()
                                        return (
                                          <Badge key={gradeKey} variant='outline'>
                                            {typeof grade === 'string'
                                              ? grade
                                              : grade.name || grade}
                                          </Badge>
                                        )
                                      })
                                    } catch (error) {
                                      console.error(
                                        `Error rendering grades for ${teacher.name}:`,
                                        error
                                      )
                                      return <span className='text-red-400 text-xs'>エラー</span>
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='text-sm'>
                                  {(() => {
                                    try {
                                      const restrictions = teacher.assignmentRestrictions || []
                                      if (restrictions.length === 0) {
                                        return <span className='text-gray-400'>割当制限なし</span>
                                      }
                                      return (
                                        <span className='text-blue-600 font-medium'>
                                          割当制限あり
                                        </span>
                                      )
                                    } catch (error) {
                                      console.error(
                                        `Error rendering restrictions for ${teacher.name}:`,
                                        error
                                      )
                                      return <span className='text-red-400 text-xs'>エラー</span>
                                    }
                                  })()}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className='flex space-x-2'>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => handleEditTeacher(teacher)}
                                    data-testid={`edit-teacher-${teacher.id}`}
                                    aria-label={`教師「${teacher.name}」を編集`}
                                    title={`教師「${teacher.name}」を編集`}
                                  >
                                    <Edit className='w-4 h-4' />
                                  </Button>
                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => teacher.id && handleDeleteTeacher(teacher.id)}
                                    data-testid={`delete-teacher-${teacher.id}`}
                                    aria-label={`教師「${teacher.name}」を削除`}
                                    title={`教師「${teacher.name}」を削除`}
                                  >
                                    <Trash2 className='w-4 h-4' />
                                  </Button>
                                </div>
                              </TableCell>
                            </SortableRow>
                          )
                        } catch (error) {
                          console.error(`Error rendering teacher row for ${teacher.name}:`, error)
                          return (
                            <SortableRow key={teacher.id} id={teacher.id || ''}>
                              <TableCell colSpan={5} className='text-center text-red-500 py-4'>
                                教師 "{teacher.name}" の表示エラー
                              </TableCell>
                            </SortableRow>
                          )
                        }
                      })}
                    </SortableContext>
                  )}
                </TableBody>
              </Table>
            </DndContext>
          )}

          <Button
            className='w-full mt-6'
            onClick={handleSaveAllTeachers}
            disabled={isLoading || isSaving}
          >
            {isSaving ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Save className='w-4 h-4 mr-2' />
            )}
            {isSaving ? '保存中...' : '教師情報を保存'}
          </Button>
        </CardContent>
      </Card>

      <TeacherEditDialog
        teacher={editingTeacher}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false)
          setEditingTeacher(null)
        }}
        onSave={updatedTeacher => {
          console.log(
            '🔄 Processing updated teacher from dialog:',
            JSON.stringify(updatedTeacher, null, 2)
          )
          console.log('📊 Current teachers count:', teachers.length)
          console.log('🔍 editingTeacher ID:', editingTeacher?.id)

          if (editingTeacher?.id) {
            // 更新: TeacherEditDialog で既に .data が抽出されているので、そのまま使用
            console.log('📝 Updating existing teacher')
            const updatedTeachers = teachers.map(t =>
              t.id === editingTeacher.id ? updatedTeacher : t
            )
            console.log('📊 Updated teachers count:', updatedTeachers.length)
            onTeachersUpdate(updatedTeachers)
          } else {
            // 新規追加: TeacherEditDialog で既に .data が抽出されているので、そのまま使用
            console.log('➕ Adding new teacher to list')
            const newTeachers = [...teachers, updatedTeacher]
            console.log('📊 New teachers count:', newTeachers.length)
            console.log('📝 New teacher added:', updatedTeacher.name)
            console.log('🚀 Calling onTeachersUpdate with new list:', newTeachers.map(t => ({ id: t.id, name: t.name })))
            
            // Force a small delay to ensure state update
            setTimeout(() => {
              console.log('🔄 Delayed state update triggered')
              onTeachersUpdate(newTeachers)
              
              // Verify the update was applied
              setTimeout(() => {
                console.log('✅ Verification: Current teachers after update:', newTeachers.length)
              }, 100)
            }, 0)
          }
          setIsDialogOpen(false)
          setEditingTeacher(null)
        }}
        token={token}
        getFreshToken={getFreshToken}
      />
    </>
  )
})
