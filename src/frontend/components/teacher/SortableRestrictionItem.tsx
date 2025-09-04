import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { AssignmentRestriction, SchoolSettings } from '@shared/schemas'
import { GripVertical, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

interface SortableRestrictionItemProps {
  restriction: AssignmentRestriction
  schoolSettings: SchoolSettings
  onUpdate: (updates: Partial<AssignmentRestriction>) => void
  onRemove: () => void
}

export function SortableRestrictionItem({
  restriction,
  schoolSettings,
  onUpdate,
  onRemove,
}: SortableRestrictionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: restriction.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  // 学年に応じたクラス数を取得
  const getClassCountForGrade = (grade: number): number => {
    switch (grade) {
      case 1:
        return schoolSettings.grade1Classes
      case 2:
        return schoolSettings.grade2Classes
      case 3:
        return schoolSettings.grade3Classes
      default:
        return 4
    }
  }

  const classCount = getClassCountForGrade(restriction.grade)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className='flex items-center space-x-2 p-3 border border-gray-200 rounded-md bg-white'
    >
      {/* ドラッグハンドル */}
      <div {...attributes} {...listeners} className='cursor-grab'>
        <GripVertical className='h-4 w-4 text-gray-400' />
      </div>

      {/* 制限タイプ */}
      <Select
        value={restriction.type}
        onValueChange={(value: AssignmentRestriction['type']) => onUpdate({ type: value })}
      >
        <SelectTrigger className='w-40'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='not_available'>利用不可</SelectItem>
          <SelectItem value='preferred'>優先</SelectItem>
          <SelectItem value='avoid'>回避</SelectItem>
        </SelectContent>
      </Select>

      {/* 時限 */}
      <Select
        value={restriction.period.toString()}
        onValueChange={value => onUpdate({ period: parseInt(value) })}
      >
        <SelectTrigger className='w-20'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 6 }, (_, i) => {
            const period = i + 1
            return (
              <SelectItem key={`period-${period}`} value={period.toString()}>
                {period}
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* 曜日 */}
      <Select
        value={restriction.day}
        onValueChange={(value: AssignmentRestriction['day']) => onUpdate({ day: value })}
      >
        <SelectTrigger className='w-24'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='mon'>月</SelectItem>
          <SelectItem value='tue'>火</SelectItem>
          <SelectItem value='wed'>水</SelectItem>
          <SelectItem value='thu'>木</SelectItem>
          <SelectItem value='fri'>金</SelectItem>
          <SelectItem value='sat'>土</SelectItem>
        </SelectContent>
      </Select>

      {/* 学年 */}
      <Select
        value={restriction.grade.toString()}
        onValueChange={value => {
          const newGrade = parseInt(value)
          onUpdate({
            grade: newGrade,
            classNumber: Math.min(restriction.classNumber, getClassCountForGrade(newGrade)),
          })
        }}
      >
        <SelectTrigger className='w-20'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='1'>1年</SelectItem>
          <SelectItem value='2'>2年</SelectItem>
          <SelectItem value='3'>3年</SelectItem>
        </SelectContent>
      </Select>

      {/* クラス */}
      <Select
        value={restriction.classNumber.toString()}
        onValueChange={value => onUpdate({ classNumber: parseInt(value) })}
      >
        <SelectTrigger className='w-20'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: classCount }, (_, i) => {
            const classNum = i + 1
            return (
              <SelectItem key={`class-${classNum}`} value={classNum.toString()}>
                {classNum}組
              </SelectItem>
            )
          })}
        </SelectContent>
      </Select>

      {/* 説明 */}
      <Input
        placeholder='説明（任意）'
        value={restriction.description || ''}
        onChange={e => onUpdate({ description: e.target.value })}
        className='flex-1'
      />

      {/* 削除ボタン */}
      <Button
        type='button'
        size='sm'
        variant='outline'
        onClick={onRemove}
        className='text-red-600 hover:text-red-700 hover:bg-red-50'
      >
        <Trash2 className='h-4 w-4' />
      </Button>
    </div>
  )
}
