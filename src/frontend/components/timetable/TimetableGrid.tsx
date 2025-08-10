import type React from 'react'
import type { TimetableSlotData } from '../../hooks/use-timetable-data'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface TimetableGridProps {
  timetableData: TimetableSlotData[]
  currentView: 'detail' | 'edit'
  selectedGrade: string
  selectedClass: number
  onDragStart?: (
    e: React.DragEvent,
    subject: string,
    teacher: string,
    period: string,
    day: string,
    grade: number,
    classNumber: number
  ) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent, period: string, day: string) => void
  onTeacherClick?: (teacherName: string) => void
}

export function TimetableGrid({
  timetableData,
  currentView,
  selectedGrade,
  selectedClass,
  onDragStart,
  onDragOver,
  onDrop,
  onTeacherClick,
}: TimetableGridProps) {
  const getViolationStyle = (violations: TimetableSlotData['violations']) => {
    if (!violations || violations.length === 0) return ''

    const highSeverity = violations.some(v => v.severity === 'high')
    const mediumSeverity = violations.some(v => v.severity === 'medium')

    if (highSeverity) return 'bg-red-100 border-red-300'
    if (mediumSeverity) return 'bg-yellow-100 border-yellow-300'
    return 'bg-blue-100 border-blue-300'
  }

  const getAutoFillStyle = (isAutoFilled?: boolean) => {
    return isAutoFilled ? 'bg-green-50 border-green-200' : ''
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='w-16'>時限</TableHead>
          <TableHead>月曜日</TableHead>
          <TableHead>火曜日</TableHead>
          <TableHead>水曜日</TableHead>
          <TableHead>木曜日</TableHead>
          <TableHead>金曜日</TableHead>
          <TableHead>土曜日</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {timetableData.map(period => (
          <TableRow key={period.period}>
            <TableCell className='font-medium'>{period.period}</TableCell>
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
              const cellData = period[day as keyof TimetableSlotData] as any
              const hasData = cellData?.subject && cellData?.teacher

              return (
                <TableCell
                  key={day}
                  className={`
                    relative min-h-[80px] align-top border-2 border-dashed border-gray-200 
                    transition-colors duration-200
                    ${currentView === 'edit' ? 'hover:bg-gray-50' : ''}
                    ${getViolationStyle(cellData?.violations)}
                    ${getAutoFillStyle(cellData?.isAutoFilled)}
                  `}
                  onDragOver={currentView === 'edit' ? onDragOver : undefined}
                  onDrop={
                    currentView === 'edit' && onDrop
                      ? (e: React.DragEvent) => onDrop(e, period.period, day)
                      : undefined
                  }
                >
                  {hasData ? (
                    <div
                      className={`
                        space-y-1 p-2 rounded border 
                        ${currentView === 'edit' ? 'cursor-move hover:shadow-md' : 'cursor-default'}
                        ${cellData?.violations?.length > 0 ? 'border-red-300' : 'border-gray-300'}
                        ${cellData?.isAutoFilled ? 'border-green-300' : ''}
                      `}
                      draggable={currentView === 'edit'}
                      onDragStart={
                        currentView === 'edit' && onDragStart
                          ? (e: React.DragEvent) =>
                              onDragStart(
                                e,
                                cellData.subject,
                                cellData.teacher,
                                period.period,
                                day,
                                parseInt(selectedGrade),
                                selectedClass
                              )
                          : undefined
                      }
                    >
                      <div className='font-medium text-sm text-blue-600'>{cellData.subject}</div>
                      <div
                        className='text-xs text-gray-600 cursor-pointer hover:text-blue-600'
                        onClick={
                          onTeacherClick ? () => onTeacherClick(cellData.teacher) : undefined
                        }
                      >
                        {cellData.teacher}
                      </div>
                      {cellData.classroom && (
                        <div className='text-xs text-gray-500'>{cellData.classroom}</div>
                      )}
                      {cellData?.violations?.length > 0 && (
                        <div className='text-xs text-red-600 mt-1'>
                          ⚠️ {cellData.violations.length}件の問題
                        </div>
                      )}
                      {cellData?.isAutoFilled && (
                        <div className='text-xs text-green-600 mt-1'>✨ 自動補完</div>
                      )}
                    </div>
                  ) : (
                    <div className='h-full min-h-[60px] flex items-center justify-center text-gray-400 text-sm'>
                      {currentView === 'edit' ? 'ここにドロップ' : '空き'}
                    </div>
                  )}
                </TableCell>
              )
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
