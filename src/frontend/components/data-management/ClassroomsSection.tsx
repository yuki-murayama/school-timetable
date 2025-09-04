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
import type { Classroom } from '@shared/schemas'
import { Edit, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { classroomApi } from '../../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { ClassroomEditDialog } from './ClassroomEditDialog'
import { SortableRow } from './SortableRow'

interface ClassroomsSectionProps {
  classrooms: Classroom[]
  onClassroomsUpdate: (classrooms: Classroom[]) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
  isLoading: boolean
}

export function ClassroomsSection({ classrooms, onClassroomsUpdate, token, getFreshToken, isLoading }: ClassroomsSectionProps) {
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [isClassroomDialogOpen, setIsClassroomDialogOpen] = useState(false)
  const [isClassroomsSaving, setIsClassroomsSaving] = useState(false)

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

  const handleAddClassroom = () => {
    setEditingClassroom(null)
    setIsClassroomDialogOpen(true)
  }

  const handleEditClassroom = (classroom: Classroom) => {
    setEditingClassroom(classroom)
    setIsClassroomDialogOpen(true)
  }

  const handleDeleteClassroom = async (id: string) => {
    if (!token) return

    try {
      console.log('🗑️ 統一型安全APIで教室削除開始:', id)
      const result = await classroomApi.deleteClassroom(id, { token })
      console.log('✅ 教室削除成功:', result)

      onClassroomsUpdate(classrooms.filter(c => c.id !== id))
      toast({
        title: '削除完了',
        description: '教室情報を削除しました',
      })
    } catch (error) {
      console.error('❌ 教室削除エラー:', error)

      if (error instanceof Error) {
        toast({
          title: '削除エラー',
          description: `入力データが無効です: ${error.validationErrors.map(e => e.message).join(', ')}`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: '削除エラー',
          description: '教室情報の削除に失敗しました',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSaveClassroom = async (classroomData: Partial<Classroom>) => {
    if (!token) return

    try {
      if (editingClassroom?.id) {
        // Update
        const updatedClassroom = await classroomApi.updateClassroom(
          editingClassroom.id,
          classroomData,
          { token, getFreshToken }
        )
        onClassroomsUpdate(classrooms.map(c => (c.id === editingClassroom.id ? updatedClassroom : c)))
        toast({
          title: '更新完了',
          description: '教室情報を更新しました',
        })
      } else {
        // Create new
        const newClassroom = await classroomApi.createClassroom(classroomData, {
          token,
          getFreshToken,
        })
        onClassroomsUpdate([...classrooms, newClassroom])
        toast({
          title: '追加完了',
          description: '教室情報を追加しました',
        })
      }
      setIsClassroomDialogOpen(false)
      setEditingClassroom(null)
    } catch (_error) {
      toast({
        title: '保存エラー',
        description: '教室情報の保存に失敗しました',
        variant: 'destructive',
      })
    }
  }

  const handleSaveAllClassrooms = async () => {
    if (!token) return

    setIsClassroomsSaving(true)
    try {
      // 各教室を個別に更新（一括更新APIがない場合）
      const updatePromises = classrooms
        .filter(classroom => classroom.id)
        .map(async classroom => {
          if (!classroom.id) throw new Error('Classroom ID is required')
          return await classroomApi.updateClassroom(classroom.id, classroom, {
            token,
            getFreshToken,
          })
        })

      await Promise.allSettled(updatePromises)
      toast({
        title: '保存完了',
        description: 'すべての教室情報を保存しました',
      })
    } catch (_error) {
      toast({
        title: '保存エラー',
        description: '教室情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsClassroomsSaving(false)
    }
  }

  // Drag and drop handler with debouncing
  const handleClassroomDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const oldIndex = classrooms.findIndex(item => item.id === active.id)
      const newIndex = classrooms.findIndex(item => item.id === over?.id)

      const newItems = arrayMove(classrooms, oldIndex, newIndex)

      // Update order fields
      const itemsWithOrder = newItems.map((item, index) => ({
        ...item,
        order: index,
      }))

      // 即座にUI更新
      onClassroomsUpdate(itemsWithOrder)

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Debounced save to backend using new batch API
      if (token) {
        timeoutRef.current = setTimeout(async () => {
          try {
            console.log('🏫 教室順序の一括更新を開始:', itemsWithOrder.length, '件')

            // 各教室の順序を個別に更新
            const updatePromises = itemsWithOrder
              .filter(classroom => classroom.id)
              .map(async classroom => {
                if (!classroom.id) throw new Error('Classroom ID is required')
                return await classroomApi.updateClassroom(
                  classroom.id,
                  { order: classroom.order },
                  { token, getFreshToken }
                )
              })

            const results = await Promise.allSettled(updatePromises)
            const successCount = results.filter(r => r.status === 'fulfilled').length

            console.log('✅ 教室順序一括更新完了:', {
              successCount,
              total: updatePromises.length,
            })

            if (successCount < updatePromises.length) {
              toast({
                title: '一部更新完了',
                description: `${successCount}/${updatePromises.length}件の教室順序を更新しました`,
                variant: 'default',
              })
            }
          } catch (_error) {
            console.error('教室順序保存エラー:', _error)
            toast({
              title: '順序保存エラー',
              description: '教室の順序保存に失敗しました',
              variant: 'destructive',
            })
          }
        }, 500) // 500ms デバウンス
      }
    }
  }

  return (
    <>
      <Card>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div>
            <CardTitle>教室情報管理</CardTitle>
            <CardDescription>教室の種類と数を管理します</CardDescription>
          </div>
          <Button onClick={handleAddClassroom} disabled={isLoading}>
            <Plus className='w-4 h-4 mr-2' />
            教室を追加
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
              onDragEnd={handleClassroomDragEnd}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className='w-8'></TableHead>
                    <TableHead>教室名</TableHead>
                    <TableHead>教室タイプ</TableHead>
                    <TableHead>数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classrooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className='text-center text-gray-500 py-8'>
                        教室情報が登録されていません
                      </TableCell>
                    </TableRow>
                  ) : (
                    <SortableContext
                      items={classrooms.map(c => c.id || '')}
                      strategy={verticalListSortingStrategy}
                    >
                      {classrooms.map(classroom => (
                        <SortableRow key={classroom.id} id={classroom.id || ''}>
                          <TableCell className='font-medium'>{classroom.name}</TableCell>
                          <TableCell>
                            <Badge variant='outline'>{classroom.type || '未設定'}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className='text-sm'>
                              {classroom.count || classroom.capacity || 1}室
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className='flex space-x-2'>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => handleEditClassroom(classroom)}
                                data-testid={`edit-classroom-${classroom.id}`}
                                aria-label={`教室「${classroom.name}」を編集`}
                                title={`教室「${classroom.name}」を編集`}
                              >
                                <Edit className='w-4 h-4 text-gray-600 hover:text-gray-900' />
                              </Button>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => classroom.id && handleDeleteClassroom(classroom.id)}
                                data-testid={`delete-classroom-${classroom.id}`}
                                aria-label={`教室「${classroom.name}」を削除`}
                                title={`教室「${classroom.name}」を削除`}
                                className='hover:bg-red-50'
                              >
                                <Trash2 className='w-4 h-4 text-red-600 hover:text-red-700' />
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

          {classrooms.length > 0 && (
            <div className='mt-4 flex justify-end'>
              <Button
                onClick={handleSaveAllClassrooms}
                disabled={isClassroomsSaving || isLoading}
                variant='outline'
              >
                {isClassroomsSaving ? (
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

      <ClassroomEditDialog
        classroom={editingClassroom}
        isOpen={isClassroomDialogOpen}
        onClose={() => {
          setIsClassroomDialogOpen(false)
          setEditingClassroom(null)
        }}
        onSave={handleSaveClassroom}
        token={token}
        getFreshToken={getFreshToken}
      />
    </>
  )
}
