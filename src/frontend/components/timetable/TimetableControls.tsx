import { ArrowLeft, Calendar, Edit, Eye } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

interface TimetableControlsProps {
  currentView: 'list' | 'detail' | 'edit' | 'teacher'
  selectedTimetable: { id: string; name: string } | null
  selectedGrade: string
  selectedClass: number
  classesForGrade: number
  editingTitle: boolean
  tempTitle: string
  complianceData: {
    overallRate: number
    violations: Array<{ severity: 'high' | 'medium' | 'low' }>
  } | null
  onBack: () => void
  onEdit: () => void
  onTitleEdit: () => void
  onTitleSave: () => void
  onTitleCancel: () => void
  onTempTitleChange: (value: string) => void
  onGradeChange: (grade: string) => void
  onClassChange: (classNum: number) => void
}

export function TimetableControls({
  currentView,
  selectedTimetable,
  selectedGrade,
  selectedClass,
  classesForGrade,
  editingTitle,
  tempTitle,
  complianceData,
  onBack,
  onEdit,
  onTitleEdit,
  onTitleSave,
  onTitleCancel,
  onTempTitleChange,
  onGradeChange,
  onClassChange,
}: TimetableControlsProps) {
  const getViolationsBadgeVariant = (
    violations: Array<{ severity: 'high' | 'medium' | 'low' }>
  ) => {
    const hasHigh = violations.some(v => v.severity === 'high')
    const hasMedium = violations.some(v => v.severity === 'medium')

    if (hasHigh) return 'destructive'
    if (hasMedium) return 'secondary'
    return 'default'
  }

  return (
    <div className='flex items-center justify-between mb-6'>
      <div className='flex items-center space-x-4'>
        <Button variant='outline' size='sm' onClick={onBack}>
          <ArrowLeft className='h-4 w-4 mr-2' />
          戻る
        </Button>

        {currentView === 'detail' && selectedTimetable && (
          <div className='flex items-center space-x-2'>
            <Calendar className='h-5 w-5 text-blue-600' />
            {editingTitle ? (
              <div className='flex items-center space-x-2'>
                <Input
                  value={tempTitle}
                  onChange={e => onTempTitleChange(e.target.value)}
                  className='w-64'
                  onKeyDown={e => {
                    if (e.key === 'Enter') onTitleSave()
                    if (e.key === 'Escape') onTitleCancel()
                  }}
                  autoFocus
                />
                <Button size='sm' onClick={onTitleSave}>
                  保存
                </Button>
                <Button size='sm' variant='outline' onClick={onTitleCancel}>
                  キャンセル
                </Button>
              </div>
            ) : (
              <div className='flex items-center space-x-2'>
                <h2 className='text-xl font-semibold'>{selectedTimetable.name}</h2>
                <Button size='sm' variant='ghost' onClick={onTitleEdit}>
                  <Edit className='h-4 w-4' />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className='flex items-center space-x-4'>
        {/* 学年・クラス選択 */}
        <div className='flex items-center space-x-2'>
          <span className='text-sm font-medium'>学年:</span>
          <select
            value={selectedGrade}
            onChange={e => onGradeChange(e.target.value)}
            className='px-3 py-1 border rounded-md text-sm'
          >
            <option value='1'>1年</option>
            <option value='2'>2年</option>
            <option value='3'>3年</option>
          </select>
        </div>

        <div className='flex items-center space-x-2'>
          <span className='text-sm font-medium'>クラス:</span>
          <select
            value={selectedClass}
            onChange={e => onClassChange(parseInt(e.target.value))}
            className='px-3 py-1 border rounded-md text-sm'
          >
            {Array.from({ length: classesForGrade }, (_, i) => {
              const classNum = i + 1
              return (
                <option key={`class-${classNum}`} value={classNum}>
                  {classNum}組
                </option>
              )
            })}
          </select>
        </div>

        {/* 適合率表示 */}
        {complianceData && (
          <div className='flex items-center space-x-2'>
            <span className='text-sm font-medium'>適合率:</span>
            <Badge variant={complianceData.overallRate >= 80 ? 'default' : 'destructive'}>
              {complianceData.overallRate}%
            </Badge>
            {complianceData.violations.length > 0 && (
              <Badge variant={getViolationsBadgeVariant(complianceData.violations)}>
                {complianceData.violations.length}件の問題
              </Badge>
            )}
          </div>
        )}

        {/* 編集モード切り替え */}
        {currentView === 'detail' && (
          <Button onClick={onEdit}>
            <Edit className='h-4 w-4 mr-2' />
            編集
          </Button>
        )}

        {currentView === 'edit' && (
          <div className='flex items-center space-x-2'>
            <Eye className='h-4 w-4' />
            <span className='text-sm text-gray-600'>編集モード</span>
          </div>
        )}
      </div>
    </div>
  )
}
