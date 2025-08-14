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
import { type Classroom, classroomApi } from '../../lib/api'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'
import { ClassroomEditDialog } from './ClassroomEditDialog'
import { SortableRow } from './SortableRow'

interface ClassroomsSectionProps {
  token: string | null
  getFreshToken?: () => Promise<string | null>
}

export function ClassroomsSection({ token, getFreshToken }: ClassroomsSectionProps) {
  const { toast } = useToast()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null)
  const [isClassroomDialogOpen, setIsClassroomDialogOpen] = useState(false)
  const [isClassroomsLoading, setIsClassroomsLoading] = useState(true)
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

  // 教室読み込み関数をメモ化
  const loadClassrooms = useCallback(async () => {
    if (!token) {
      setIsClassroomsLoading(false)
      return
    }

    setIsClassroomsLoading(true)

    try {
      const classroomsData = await classroomApi.getClassrooms({ token, getFreshToken })

      console.log('Classrooms response:', classroomsData)
      console.log('Is array?', Array.isArray(classroomsData))

      const classrooms = Array.isArray(classroomsData) ? classroomsData : []

      // Sort by order field, then by name if no order
      const sortedClassrooms = classrooms.sort((a, b) => {
        if (a.order != null && b.order != null) {
          return a.order - b.order
        }
        if (a.order != null) return -1
        if (b.order != null) return 1
        return a.name.localeCompare(b.name)
      })

      setClassrooms(sortedClassrooms)
    } catch (_error) {
      console.error('Error loading classrooms:', _error)
      // Remove toast to prevent infinite loop
      console.error('教室情報の読み込みに失敗しました')
    } finally {
      setIsClassroomsLoading(false)
    }
  }, [token]) // getFreshTokenは最新値を参照するため除外

  // Load classrooms useEffect
  useEffect(() => {
    loadClassrooms()
  }, [loadClassrooms]) // loadClassroomsを依存関係に含める

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
      await classroomApi.deleteClassroom(id, { token, getFreshToken })
      setClassrooms(classrooms.filter(c => c.id !== id))
      toast({
        title: '削除完了',
        description: '教室情報を削除しました',
      })
    } catch (_error) {
      toast({
        title: '削除エラー',
        description: '教室情報の削除に失敗しました',
        variant: 'destructive',
      })
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
        setClassrooms(classrooms.map(c => (c.id === editingClassroom.id ? updatedClassroom : c)))
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
        setClassrooms([...classrooms, newClassroom])
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
      await classroomApi.saveClassrooms(classrooms, { token, getFreshToken })
      toast({
        title: '保存完了',
        description: '全ての教室情報を保存しました',
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
      setClassrooms(items => {
        const oldIndex = items.findIndex(item => item.id === active.id)
        const newIndex = items.findIndex(item => item.id === over?.id)

        const newItems = arrayMove(items, oldIndex, newIndex)

        // Update order fields
        const itemsWithOrder = newItems.map((item, index) => ({
          ...item,
          order: index,
        }))

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Debounced save to backend using new batch API
        if (token) {
          timeoutRef.current = setTimeout(async () => {
            try {
              console.log('🏫 教室順序の一括更新を開始:', itemsWithOrder.length, '件')

              const reorderData = itemsWithOrder
                .filter(item => item.id) // IDが存在するもののみ
                .map(item => ({
                  id: item.id as string, // filterで確認済み
                  order: item.order || 0,
                }))

              const result = await classroomApi.reorderClassrooms(reorderData, {
                token,
                getFreshToken,
              })

              console.log(
                '✅ 教室順序一括更新完了:',
                result.updatedCount,
                '/',
                result.totalRequested
              )

              if (result.updatedCount < result.totalRequested) {
                toast({
                  title: '一部更新完了',
                  description: `${result.updatedCount}/${result.totalRequested}件の教室順序を更新しました`,
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

        return itemsWithOrder
      })
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
          <Button onClick={handleAddClassroom} disabled={isClassroomsLoading}>
            <Plus className='w-4 h-4 mr-2' />
            教室を追加
          </Button>
        </CardHeader>
        <CardContent>
          {isClassroomsLoading ? (
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
                              >
                                <Trash2 className='w-4 h-4 text-red-500 hover:text-red-700' />
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
            onClick={handleSaveAllClassrooms}
            disabled={isClassroomsLoading || isClassroomsSaving}
          >
            {isClassroomsSaving ? (
              <Loader2 className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Save className='w-4 h-4 mr-2' />
            )}
            {isClassroomsSaving ? '保存中...' : '教室情報を保存'}
          </Button>
        </CardContent>
      </Card>

      <ClassroomEditDialog
        classroom={editingClassroom}
        isOpen={isClassroomDialogOpen}
        onClose={() => setIsClassroomDialogOpen(false)}
        onSave={handleSaveClassroom}
        token={token}
      />
    </>
  )
}
