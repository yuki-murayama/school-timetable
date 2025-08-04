import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import { type Classroom, classroomApi, type Subject } from '../../lib/api'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '../ui/sheet'

interface SubjectEditDialogProps {
  subject: Subject | null
  isOpen: boolean
  onClose: () => void
  onSave: (subjectData: Partial<Subject>) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
}

interface SubjectFormData {
  name: string
  specialClassroom: string
  weekly_hours: number
  target_grades: number[]
}

export function SubjectEditDialog({
  subject,
  isOpen,
  onClose,
  onSave,
  token,
  getFreshToken,
}: SubjectEditDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<SubjectFormData>({
    name: '',
    specialClassroom: '',
    weekly_hours: 1,
    target_grades: [],
  })
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [isClassroomsLoading, setIsClassroomsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (subject) {
      setFormData({
        name: subject.name,
        specialClassroom: subject.specialClassroom || '',
        weekly_hours: subject.weekly_hours || 1,
        target_grades: subject.targetGrades || [],
      })
    } else {
      setFormData({ name: '', specialClassroom: '', weekly_hours: 1, target_grades: [] })
    }
  }, [subject])

  // Load classrooms for dropdown
  useEffect(() => {
    const loadClassrooms = async () => {
      if (!token) {
        setIsClassroomsLoading(false)
        return
      }

      setIsClassroomsLoading(true)

      try {
        const classroomsData = await classroomApi.getClassrooms({ token, getFreshToken })
        const classrooms = Array.isArray(classroomsData) ? classroomsData : []
        setClassrooms(classrooms)
      } catch (error) {
        console.error('Error loading classrooms:', error)
        // Classroom loading error is not critical, just continue with empty list
      } finally {
        setIsClassroomsLoading(false)
      }
    }

    if (isOpen) {
      loadClassrooms()
    }
  }, [token, getFreshToken, isOpen])

  // Validation function for subject data
  const validateSubject = (subject: SubjectFormData) => {
    const errors = []

    if (!subject.name || !subject.name.trim()) {
      errors.push('教科名を入力してください')
    }

    if (subject.weekly_hours < 1 || subject.weekly_hours > 10) {
      errors.push('週の授業数は1から10の範囲で入力してください')
    }

    if (subject.target_grades && Array.isArray(subject.target_grades)) {
      const validGrades = [1, 2, 3]
      const invalidGrades = subject.target_grades.filter(
        (grade: number) => !validGrades.includes(grade)
      )
      if (invalidGrades.length > 0) {
        errors.push('対象学年は1、2、3のいずれかを指定してください')
      }
    }

    return errors
  }

  const handleSave = async () => {
    if (!token) return

    // Validate subject data
    const validationErrors = validateSubject(formData)
    if (validationErrors.length > 0) {
      toast({
        title: '入力エラー',
        description: validationErrors.join('\n'),
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      // Prepare data for API - normalize targetGrades
      const apiData = {
        ...formData,
        // Send empty targetGrades as empty array, not undefined
        targetGrades: formData.target_grades.length > 0 ? formData.target_grades : [],
      }

      // Remove the old target_grades field to avoid confusion
      delete apiData.target_grades

      await onSave(apiData)
      onClose()
    } catch (error) {
      console.error('教科保存エラー:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGradeChange = (grade: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        target_grades: [...prev.target_grades, grade].sort(),
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        target_grades: prev.target_grades.filter(g => g !== grade),
      }))
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='right' className='sm:max-w-[500px] w-full overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>{subject ? '教科情報を編集' : '新しい教科を追加'}</SheetTitle>
          <SheetDescription>
            教科名、対象学年、専用教室、1週間の授業数を設定してください
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4'>
          {/* 教科名 */}
          <div>
            <Label htmlFor='subject-name'>教科名</Label>
            <Input
              id='subject-name'
              value={formData.name}
              onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder='教科名を入力'
            />
          </div>

          {/* 対象学年 */}
          <div>
            <Label>対象学年</Label>
            <div className='flex flex-col gap-2 mt-2'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='grade-1'
                  checked={formData.target_grades.includes(1)}
                  onCheckedChange={(checked: boolean) => handleGradeChange(1, checked)}
                />
                <Label htmlFor='grade-1'>1年生</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='grade-2'
                  checked={formData.target_grades.includes(2)}
                  onCheckedChange={(checked: boolean) => handleGradeChange(2, checked)}
                />
                <Label htmlFor='grade-2'>2年生</Label>
              </div>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='grade-3'
                  checked={formData.target_grades.includes(3)}
                  onCheckedChange={(checked: boolean) => handleGradeChange(3, checked)}
                />
                <Label htmlFor='grade-3'>3年生</Label>
              </div>
              <p className='text-xs text-muted-foreground mt-1'>
                選択しない場合は全学年が対象となります
              </p>
            </div>
          </div>

          {/* 専用教室 */}
          <div>
            <Label htmlFor='special-classroom'>専用教室（任意）</Label>
            {classrooms.length > 0 && !isClassroomsLoading ? (
              <Select
                value={formData.specialClassroom || 'none'}
                onValueChange={value =>
                  setFormData(prev => ({
                    ...prev,
                    specialClassroom: value === 'none' ? '' : value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='教室を選択' />
                </SelectTrigger>
                <SelectContent className='z-[70]'>
                  <SelectItem value='none'>選択なし</SelectItem>
                  {classrooms.map(classroom => (
                    <SelectItem key={classroom.id} value={classroom.name}>
                      {classroom.name}
                      {classroom.type && (
                        <span className='text-gray-500 ml-1'>({classroom.type})</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id='special-classroom'
                value={formData.specialClassroom}
                onChange={e => setFormData(prev => ({ ...prev, specialClassroom: e.target.value }))}
                placeholder={
                  isClassroomsLoading ? '教室情報を読み込み中...' : '例：理科室、音楽室、体育館'
                }
                disabled={isClassroomsLoading}
              />
            )}
          </div>

          {/* 1週間の授業数 */}
          <div>
            <Label htmlFor='weekly-lessons'>1週間の授業数</Label>
            <Input
              id='weekly-lessons'
              type='number'
              min='1'
              max='10'
              value={formData.weekly_hours}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  weekly_hours: Number.parseInt(e.target.value) || 1,
                }))
              }
              placeholder='週に何回授業を行うか'
            />
            <p className='text-xs text-muted-foreground mt-1'>
              例：数学=6回、英語=4回、音楽=1回、体育=3回
            </p>
          </div>
        </div>

        <SheetFooter className='mt-6'>
          <Button variant='outline' onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={validateSubject(formData).length > 0 || isSaving}>
            <Save className='w-4 h-4 mr-2' />
            {subject ? '更新' : '追加'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
