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
import { Plus } from 'lucide-react'
import { useCallback } from 'react'
import type { AssignmentRestriction, SchoolSettings } from '../../../shared/types'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { SortableRestrictionItem } from './SortableRestrictionItem'

interface AssignmentRestrictionsManagerProps {
  restrictions: AssignmentRestriction[]
  onRestrictionsChange: (restrictions: AssignmentRestriction[]) => void
  schoolSettings: SchoolSettings
}

export function AssignmentRestrictionsManager({
  restrictions,
  onRestrictionsChange,
  schoolSettings,
}: AssignmentRestrictionsManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 新しい制限を追加
  const addRestriction = useCallback(() => {
    const newRestriction: AssignmentRestriction = {
      id: `restriction-${Date.now()}`,
      type: 'not_available',
      period: 1,
      day: 'mon',
      grade: 1,
      classNumber: 1,
      description: '',
    }
    onRestrictionsChange([...restrictions, newRestriction])
  }, [restrictions, onRestrictionsChange])

  // 制限を削除
  const removeRestriction = useCallback(
    (id: string) => {
      onRestrictionsChange(restrictions.filter(r => r.id !== id))
    },
    [restrictions, onRestrictionsChange]
  )

  // 制限を更新
  const updateRestriction = useCallback(
    (id: string, updates: Partial<AssignmentRestriction>) => {
      onRestrictionsChange(restrictions.map(r => (r.id === id ? { ...r, ...updates } : r)))
    },
    [restrictions, onRestrictionsChange]
  )

  // ドラッグ終了処理
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = restrictions.findIndex(r => r.id === active.id)
        const newIndex = restrictions.findIndex(r => r.id === over.id)

        onRestrictionsChange(arrayMove(restrictions, oldIndex, newIndex))
      }
    },
    [restrictions, onRestrictionsChange]
  )

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <Label className='text-base font-medium'>割当制限 ({restrictions.length}件)</Label>
        <Button type='button' size='sm' variant='outline' onClick={addRestriction}>
          <Plus className='h-4 w-4 mr-2' />
          制限を追加
        </Button>
      </div>

      {restrictions.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={restrictions.map(r => r.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className='space-y-2'>
              {restrictions.map(restriction => (
                <SortableRestrictionItem
                  key={restriction.id}
                  restriction={restriction}
                  schoolSettings={schoolSettings}
                  onUpdate={updates => updateRestriction(restriction.id, updates)}
                  onRemove={() => removeRestriction(restriction.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {restrictions.length === 0 && (
        <div className='text-center py-8 text-gray-500'>
          <p>割当制限が設定されていません</p>
          <p className='text-sm'>「制限を追加」ボタンで新しい制限を追加できます</p>
        </div>
      )}
    </div>
  )
}
