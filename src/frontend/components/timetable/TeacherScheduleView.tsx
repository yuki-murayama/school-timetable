import { ArrowLeft, User } from 'lucide-react'
import type { TimetableSlotData } from '../../hooks/use-timetable-data'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table'

interface TeacherSchedule {
  period: string
  mon: { grade: string; class: string; subject: string } | null
  tue: { grade: string; class: string; subject: string } | null
  wed: { grade: string; class: string; subject: string } | null
  thu: { grade: string; class: string; subject: string } | null
  fri: { grade: string; class: string; subject: string } | null
  sat: { grade: string; class: string; subject: string } | null
}

interface TeacherScheduleViewProps {
  selectedTeacher: string
  timetableData: TimetableSlotData[]
  onBack: () => void
}

export function TeacherScheduleView({
  selectedTeacher,
  timetableData,
  onBack,
}: TeacherScheduleViewProps) {
  // 教師のスケジュールを生成
  const generateTeacherSchedule = (teacherName: string): TeacherSchedule[] => {
    const schedule: TeacherSchedule[] = []
    const periods = ['1', '2', '3', '4', '5', '6']

    periods.forEach(period => {
      const scheduleEntry: TeacherSchedule = {
        period,
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
      }

      const periodRow = timetableData.find(row => row.period === period.toString())
      if (periodRow) {
        const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
        days.forEach(day => {
          const cellData = periodRow[day] as any
          if (cellData?.teacher === teacherName) {
            scheduleEntry[day] = {
              grade: '1', // 現在選択中の学年
              class: '1', // 現在選択中のクラス
              subject: cellData.subject || '',
            }
          }
        })
      }

      schedule.push(scheduleEntry)
    })

    return schedule
  }

  const teacherSchedule = generateTeacherSchedule(selectedTeacher)

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <User className='h-5 w-5 text-blue-600' />
            <div>
              <CardTitle>{selectedTeacher}先生の時間割</CardTitle>
              <CardDescription>週間スケジュール</CardDescription>
            </div>
          </div>
          <Button variant='outline' size='sm' onClick={onBack}>
            <ArrowLeft className='h-4 w-4 mr-2' />
            時間割に戻る
          </Button>
        </div>
      </CardHeader>
      <CardContent>
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
            {teacherSchedule.map(period => (
              <TableRow key={period.period}>
                <TableCell className='font-medium'>{period.period}</TableCell>
                {['mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
                  const dayKey = day as keyof Omit<TeacherSchedule, 'period'>
                  const assignment = period[dayKey]

                  return (
                    <TableCell key={day} className='min-h-[60px] align-top'>
                      {assignment ? (
                        <div className='space-y-1 p-2 bg-blue-50 rounded border border-blue-200'>
                          <div className='font-medium text-sm text-blue-600'>
                            {assignment.subject}
                          </div>
                          <div className='text-xs text-gray-600'>
                            {assignment.grade}年{assignment.class}組
                          </div>
                        </div>
                      ) : (
                        <div className='h-full min-h-[60px] flex items-center justify-center text-gray-400 text-sm'>
                          空き
                        </div>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
