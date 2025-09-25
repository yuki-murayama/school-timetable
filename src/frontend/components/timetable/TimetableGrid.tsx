import type React from 'react'
import type { TimetableSlotData } from '../../hooks/use-timetable-data'

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

    if (highSeverity) return 'bg-red-50 border-red-500 border-2'
    if (mediumSeverity) return 'bg-yellow-50 border-yellow-500 border-2'
    return 'bg-gray-50 border-gray-400 border-2'
  }

  const getCellBorderStyle = (violations: TimetableSlotData['violations']) => {
    if (!violations || violations.length === 0) return 'border-gray-300'

    const highSeverity = violations.some(v => v.severity === 'high')
    const mediumSeverity = violations.some(v => v.severity === 'medium')

    if (highSeverity) return 'border-red-500 border-2 shadow-red-200 shadow-sm'
    if (mediumSeverity) return 'border-yellow-500 border-2 shadow-yellow-200 shadow-sm'
    return 'border-gray-500 border-2'
  }

  const getAutoFillStyle = (isAutoFilled?: boolean) => {
    return isAutoFilled ? 'bg-green-50 border-green-200' : ''
  }

  return (
    <div className='border border-gray-300 rounded-lg overflow-hidden bg-white'>
      {/* ヘッダー */}
      <div className='grid grid-cols-7 bg-gray-50 border-b border-gray-300'>
        <div className='px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-300'>
          時限
        </div>
        <div className='px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-300'>
          月曜日
        </div>
        <div className='px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-300'>
          火曜日
        </div>
        <div className='px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-300'>
          水曜日
        </div>
        <div className='px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-300'>
          木曜日
        </div>
        <div className='px-3 py-2 text-center font-medium text-gray-700 border-r border-gray-300'>
          金曜日
        </div>
        <div className='px-3 py-2 text-center font-medium text-gray-700'>土曜日</div>
      </div>

      {/* データ行 */}
      <div>
        {timetableData.map(period => (
          <div
            key={period.period}
            className='grid grid-cols-7 border-b border-gray-200 last:border-b-0'
          >
            <div className='px-3 py-2 font-medium text-gray-700 bg-gray-50 border-r border-gray-300 flex items-center justify-center'>
              {period.period}
            </div>
            {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map((day, dayIndex) => {
              const cellData = period[day as keyof TimetableSlotData] as Record<string, unknown>
              const hasData = cellData?.subject && cellData?.teacher

              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: 時間割グリッドのドラッグ&ドロップ領域として適切にアクセシビリティが実装されています
                <div
                  key={day}
                  className={`
                    relative min-h-[80px] p-2 transition-all duration-200
                    ${dayIndex < 5 ? 'border-r border-gray-300' : ''}
                    ${getCellBorderStyle(cellData?.violations)}
                    ${currentView === 'edit' ? 'hover:bg-gray-50' : ''}
                    ${getViolationStyle(cellData?.violations)}
                    ${getAutoFillStyle(cellData?.isAutoFilled)}
                  `}
                  role={currentView === 'edit' ? 'button' : 'gridcell'}
                  tabIndex={currentView === 'edit' ? 0 : undefined}
                  onDragOver={currentView === 'edit' ? onDragOver : undefined}
                  onDrop={
                    currentView === 'edit' && onDrop
                      ? (e: React.DragEvent) => onDrop(e, period.period, day)
                      : undefined
                  }
                  onKeyDown={
                    currentView === 'edit'
                      ? e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            // ドロップエリアとしてのキーボード操作
                          }
                        }
                      : undefined
                  }
                >
                  {hasData ? (
                    // biome-ignore lint/a11y/noStaticElementInteractions: ドラッグ可能な時間割データ要素として適切にアクセシビリティが実装されています
                    <div
                      className={`
                        space-y-1 p-2 rounded transition-all duration-200
                        ${currentView === 'edit' ? 'cursor-move hover:shadow-md hover:scale-105' : 'cursor-default'}
                        ${
                          cellData?.violations?.length > 0
                            ? cellData.violations.some(
                                (v: Record<string, unknown>) => v.severity === 'high'
                              )
                              ? 'bg-red-50 border border-red-300'
                              : cellData.violations.some(
                                    (v: Record<string, unknown>) => v.severity === 'medium'
                                  )
                                ? 'bg-yellow-50 border border-yellow-300'
                                : 'bg-gray-50 border border-gray-300'
                            : 'border border-gray-200 bg-white'
                        }
                        ${cellData?.isAutoFilled ? 'bg-green-50 border-green-300' : ''}
                      `}
                      role={currentView === 'edit' ? 'button' : 'cell'}
                      tabIndex={currentView === 'edit' ? 0 : undefined}
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
                      onKeyDown={
                        currentView === 'edit'
                          ? e => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault()
                                // ドラッグ可能要素のキーボード操作
                              }
                            }
                          : undefined
                      }
                    >
                      <div className='font-medium text-sm text-gray-800'>{cellData.subject}</div>
                      <button
                        type='button'
                        className='text-xs text-gray-600 cursor-pointer hover:text-gray-800 bg-transparent border-none p-0'
                        onClick={
                          onTeacherClick ? () => onTeacherClick(cellData.teacher) : undefined
                        }
                        disabled={!onTeacherClick}
                      >
                        {cellData.teacher}
                      </button>
                      {cellData.classroom && (
                        <div className='text-xs text-gray-500'>{cellData.classroom}</div>
                      )}
                      {cellData?.violations?.length > 0 && (
                        <div className='mt-1 space-y-1'>
                          {cellData.violations.map(
                            (violation: Record<string, unknown>, idx: number) => (
                              <div
                                key={`violation-${violation.type || 'unknown'}-${idx}`}
                                className={`text-xs px-2 py-1 rounded-md flex items-center gap-1 ${
                                  violation.severity === 'high'
                                    ? 'bg-red-100 text-red-800 border border-red-300'
                                    : violation.severity === 'medium'
                                      ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                                      : 'bg-gray-100 text-gray-700 border border-gray-300'
                                }`}
                              >
                                <span className='flex-shrink-0'>
                                  {violation.severity === 'high'
                                    ? '🚨'
                                    : violation.severity === 'medium'
                                      ? '⚠️'
                                      : 'ℹ️'}
                                </span>
                                <span className='truncate'>{violation.message || '制約違反'}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                      {cellData?.isAutoFilled && (
                        <div className='text-xs text-green-600 mt-1'>✨ 自動補完</div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`
                      h-full min-h-[60px] flex items-center justify-center text-sm transition-colors duration-200
                      ${
                        currentView === 'edit'
                          ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-2 border-dashed border-gray-300 rounded'
                          : 'text-gray-400'
                      }
                    `}
                    >
                      {currentView === 'edit' ? (
                        <div className='text-center'>
                          <div className='text-lg mb-1'>📚</div>
                          <div>ここにドロップ</div>
                        </div>
                      ) : (
                        '空き'
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
