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
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus, Save, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useToast } from '../../hooks/use-toast'
import {
  type AssignmentRestriction,
  type SchoolSettings,
  type Subject,
  schoolApi,
  subjectApi,
  type Teacher,
  teacherApi,
} from '../../lib/api'
import { Badge } from '../ui/badge'
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

interface TeacherEditDialogProps {
  teacher: Teacher | null
  isOpen: boolean
  onClose: () => void
  onSave: (teacherData: Partial<Teacher>) => void
  token: string | null
  getFreshToken?: () => Promise<string | null>
}

interface TeacherFormData {
  name: string
  subjects: string[]
  grades: string[]
  assignmentRestrictions: AssignmentRestriction[]
}

// ドラッグ&ドロップ対応の割当制限アイテムコンポーネント
interface SortableRestrictionItemProps {
  restriction: AssignmentRestriction
  index: number
  onUpdate: (index: number, field: keyof AssignmentRestriction, value: unknown) => void
  onRemove: (index: number) => void
  onPeriodToggle: (restrictionIndex: number, period: number) => void
  getPeriodsForDay: (day: string) => number
}

function SortableRestrictionItem({
  restriction,
  index,
  onUpdate,
  onRemove,
  onPeriodToggle,
  getPeriodsForDay,
}: SortableRestrictionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `restriction-${index}`,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border border-gray-200 rounded-lg p-4 ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className='flex items-center justify-between mb-3'>
        <div className='flex items-center gap-2'>
          <div
            {...attributes}
            {...listeners}
            className='cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded'
          >
            <GripVertical className='w-4 h-4 text-gray-400' />
          </div>
          <span className='font-medium text-sm'>制限 {restriction.displayOrder}</span>
        </div>
        <Button
          onClick={() => onRemove(index)}
          size='sm'
          variant='ghost'
          className='text-red-500 hover:text-red-700'
        >
          <Trash2 className='w-4 h-4' />
        </Button>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-3'>
        {/* 割当不可曜日 */}
        <div>
          <Label className='text-xs'>割当不可曜日</Label>
          <Select
            value={restriction.restrictedDay}
            onValueChange={value => onUpdate(index, 'restrictedDay', value)}
          >
            <SelectTrigger className='h-8'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='z-[70]'>
              <SelectItem value='月曜'>月曜</SelectItem>
              <SelectItem value='火曜'>火曜</SelectItem>
              <SelectItem value='水曜'>水曜</SelectItem>
              <SelectItem value='木曜'>木曜</SelectItem>
              <SelectItem value='金曜'>金曜</SelectItem>
              <SelectItem value='土曜'>土曜</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 割当不可レベル */}
        <div>
          <Label className='text-xs'>割当不可レベル</Label>
          <Select
            value={restriction.restrictionLevel}
            onValueChange={value => onUpdate(index, 'restrictionLevel', value)}
          >
            <SelectTrigger className='h-8'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className='z-[70]'>
              <SelectItem value='必須'>必須</SelectItem>
              <SelectItem value='推奨'>推奨</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 割当不可時限 */}
      <div>
        <Label className='text-xs'>割当不可時限</Label>
        <div className='flex flex-wrap gap-2 mt-1'>
          {Array.from({ length: getPeriodsForDay(restriction.restrictedDay) }, (_, i) => i + 1).map(
            period => (
              <div key={period} className='flex items-center space-x-1'>
                <Checkbox
                  id={`restriction-${index}-period-${period}`}
                  checked={restriction.restrictedPeriods.includes(period)}
                  onCheckedChange={() => onPeriodToggle(index, period)}
                />
                <Label
                  htmlFor={`restriction-${index}-period-${period}`}
                  className='text-xs cursor-pointer'
                >
                  {period}時限
                </Label>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

export function TeacherEditDialog({
  teacher,
  isOpen,
  onClose,
  onSave,
  token,
  getFreshToken,
}: TeacherEditDialogProps) {
  const { toast } = useToast()
  const [formData, setFormData] = useState<TeacherFormData>({
    name: '',
    subjects: [],
    grades: [],
    assignmentRestrictions: [],
  })
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [newGrade, setNewGrade] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false)
  const [schoolSettings, setSchoolSettings] = useState<SchoolSettings | null>(null)

  // ドラッグ&ドロップセンサー
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    console.log('🔄 TeacherEditDialog useEffect triggered, teacher:', teacher, 'isOpen:', isOpen)
    // isOpenがfalseの場合はformDataをリセットしない（ダイアログが閉じている最中）
    if (teacher && isOpen) {
      // APIから返されるsubjectsはオブジェクト配列なので文字列配列に変換
      const subjectNames = (teacher.subjects || []).map(subject =>
        typeof subject === 'string' ? subject : subject.name
      )
      const gradeNames = (teacher.grades || []).map(grade =>
        typeof grade === 'string' ? grade : grade.toString()
      )

      console.log('📚 Setting initial subjects:', subjectNames)
      console.log('🎓 Setting initial grades:', gradeNames)

      setFormData({
        name: teacher.name,
        subjects: subjectNames,
        grades: gradeNames,
        assignmentRestrictions: teacher.assignmentRestrictions || [],
      })
    } else if (!teacher && isOpen) {
      // 新規作成の場合のみリセット
      console.log('🔄 Resetting formData to empty for new teacher')
      setFormData({ name: '', subjects: [], grades: [], assignmentRestrictions: [] })
    } else {
      console.log('🔄 Skipping formData reset - dialog is closing or closed')
    }
  }, [teacher, isOpen])

  // 教科データを読み込む
  useEffect(() => {
    const loadSubjects = async () => {
      if (!token || !isOpen) return

      setIsLoadingSubjects(true)
      try {
        const subjects = await subjectApi.getSubjects({ token, getFreshToken })
        setAvailableSubjects(subjects || [])
      } catch (error) {
        console.error('Failed to load subjects:', error)
        toast({
          title: '読み込みエラー',
          description: '教科情報の読み込みに失敗しました',
          variant: 'destructive',
        })
      } finally {
        setIsLoadingSubjects(false)
      }
    }

    loadSubjects()
  }, [token, isOpen, getFreshToken])

  // 学校設定を読み込む
  useEffect(() => {
    const loadSchoolSettings = async () => {
      if (!token || !isOpen) return

      try {
        const settings = await schoolApi.getSettings({ token, getFreshToken })
        setSchoolSettings(settings)
      } catch (error) {
        console.error('Failed to load school settings:', error)
      }
    }

    loadSchoolSettings()
  }, [token, isOpen, getFreshToken])

  const handleSave = async () => {
    console.log('🚩 handleSave called!')
    console.log('🔐 Token available:', !!token)
    console.log('📝 formData.name:', formData.name)
    console.log('✂️ formData.name.trim():', formData.name.trim())
    console.log('🔄 isSaving:', isSaving)

    // デバッグ用にlocalStorageに記録
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('handleSaveDebug', `called at ${new Date().toISOString()}`)
    }

    if (!token || !formData.name.trim()) {
      console.log('❌ Early return from handleSave - token or name missing')
      return
    }

    setIsSaving(true)
    try {
      if (teacher?.id) {
        // 更新
        console.log('📝 Updating teacher with data:', formData)
        const updatedTeacher = await teacherApi.updateTeacher(teacher.id, formData, {
          token,
          getFreshToken,
        })
        console.log('✅ Updated teacher received:', updatedTeacher)
        onSave(updatedTeacher) // APIクライアントで既に.dataが抽出されているので直接使用
        toast({
          title: '更新完了',
          description: '教師情報を更新しました',
        })
      } else {
        // 新規作成
        console.log('➕ Creating teacher with data:', JSON.stringify(formData, null, 2))
        console.log('🔐 Using token:', token ? 'Token present' : 'No token')
        console.log('🔄 getFreshToken function:', getFreshToken ? 'Available' : 'Not available')

        try {
          const newTeacher = await teacherApi.createTeacher(formData, { token, getFreshToken })
          console.log('✅ New teacher received:', JSON.stringify(newTeacher, null, 2))

          // onSaveコールバックを実行してテーブルを更新
          console.log('🔄 Calling onSave callback with new teacher')
          onSave(newTeacher)

          toast({
            title: '追加完了',
            description: '教師情報を追加しました',
          })
        } catch (createError: unknown) {
          console.error('❌ Teacher creation failed:', createError)
          console.error('❌ Error details:', {
            message: createError?.message,
            status: createError?.status,
            response: createError?.response,
          })
          throw createError // Re-throw to be caught by outer catch
        }
      }
      onClose()
    } catch (error) {
      console.error('❌ Teacher save error:', error)
      toast({
        title: '保存エラー',
        description: '教師情報の保存に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // テスト用にhandleSave関数をグローバルに公開
  useEffect(() => {
    if (typeof window !== 'undefined' && isOpen) {
      ;(window as unknown as { testHandleSave: typeof handleSave }).testHandleSave = handleSave
      console.log('🧪 Exposed handleSave function globally for testing')
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { testHandleSave?: typeof handleSave }).testHandleSave
      }
    }
  }, [handleSave, isOpen])

  const handleAddSubject = () => {
    console.log('🔍 handleAddSubject called with:', selectedSubject)
    console.log('📋 Current formData.subjects before:', formData.subjects)
    if (selectedSubject && !formData.subjects.includes(selectedSubject)) {
      const newSubjects = [...formData.subjects, selectedSubject]
      console.log('✅ Adding subject, new subjects array:', newSubjects)
      setFormData(prev => {
        console.log('📝 setFormData prev:', prev)
        const updated = {
          ...prev,
          subjects: newSubjects,
        }
        console.log('📝 setFormData updated:', updated)
        return updated
      })
      setSelectedSubject('')
    } else {
      console.log('❌ Subject not added - either empty or already exists')
    }
  }

  // 科目選択時に自動的に追加する関数
  const handleSubjectSelect = (subjectName: string) => {
    console.log('🎯 Subject selected:', subjectName)
    setSelectedSubject(subjectName)

    // 既に追加されていない場合は自動的に追加
    if (subjectName && !formData.subjects.includes(subjectName)) {
      const newSubjects = [...formData.subjects, subjectName]
      console.log('✅ Auto-adding subject, new subjects array:', newSubjects)
      setFormData(prev => ({
        ...prev,
        subjects: newSubjects,
      }))
      setSelectedSubject('') // 選択状態をリセット
    }
  }

  const handleRemoveSubject = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.filter(s => s !== subject),
    }))
  }

  const handleAddGrade = () => {
    if (newGrade && !formData.grades.includes(newGrade)) {
      setFormData(prev => ({
        ...prev,
        grades: [...prev.grades, newGrade],
      }))
      setNewGrade('')
    }
  }

  // 学年選択時に自動的に追加する関数
  const handleGradeSelect = (gradeName: string) => {
    console.log('🎯 Grade selected:', gradeName)
    setNewGrade(gradeName)

    // 既に追加されていない場合は自動的に追加
    if (gradeName && !formData.grades.includes(gradeName)) {
      console.log('✅ Auto-adding grade:', gradeName)
      setFormData(prev => ({
        ...prev,
        grades: [...prev.grades, gradeName],
      }))
      setNewGrade('') // 選択状態をリセット
    }
  }

  const handleRemoveGrade = (grade: string) => {
    setFormData(prev => ({
      ...prev,
      grades: prev.grades.filter(g => g !== grade),
    }))
  }

  // 曜日の順序配列
  const dayOrder = ['月曜', '火曜', '水曜', '木曜', '金曜', '土曜']

  // 次の曜日を取得する関数
  const getNextDay = (currentDay: string): string => {
    const currentIndex = dayOrder.indexOf(currentDay)
    const nextIndex = (currentIndex + 1) % dayOrder.length
    return dayOrder[nextIndex]
  }

  // 割当制限関連の処理
  const handleAddRestriction = () => {
    // 既存の制限がある場合は、表示順序が最も大きい（一番下の）制限の曜日の次の曜日を設定
    let defaultDay = '月曜' // デフォルト値

    if (formData.assignmentRestrictions.length > 0) {
      // 表示順序でソートして最後の制限を取得
      const sortedRestrictions = [...formData.assignmentRestrictions].sort(
        (a, b) => a.displayOrder - b.displayOrder
      )
      const lastRestriction = sortedRestrictions[sortedRestrictions.length - 1]
      defaultDay = getNextDay(lastRestriction.restrictedDay)
    }

    const newRestriction: AssignmentRestriction = {
      displayOrder: formData.assignmentRestrictions.length + 1,
      restrictedDay: defaultDay,
      restrictedPeriods: [],
      restrictionLevel: '必須',
    }

    setFormData(prev => ({
      ...prev,
      assignmentRestrictions: [...prev.assignmentRestrictions, newRestriction],
    }))
  }

  const handleRemoveRestriction = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assignmentRestrictions: prev.assignmentRestrictions
        .filter((_, i) => i !== index)
        .map((restriction, newIndex) => ({
          ...restriction,
          displayOrder: newIndex + 1,
        })),
    }))
  }

  const handleUpdateRestriction = (
    index: number,
    field: keyof AssignmentRestriction,
    value: unknown
  ) => {
    setFormData(prev => ({
      ...prev,
      assignmentRestrictions: prev.assignmentRestrictions.map((restriction, i) =>
        i === index ? { ...restriction, [field]: value } : restriction
      ),
    }))
  }

  const handlePeriodToggle = (restrictionIndex: number, period: number) => {
    const restriction = formData.assignmentRestrictions[restrictionIndex]
    const newPeriods = restriction.restrictedPeriods.includes(period)
      ? restriction.restrictedPeriods.filter(p => p !== period)
      : [...restriction.restrictedPeriods, period].sort((a, b) => a - b)

    handleUpdateRestriction(restrictionIndex, 'restrictedPeriods', newPeriods)
  }

  // ドラッグ&ドロップ終了時の処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      const activeIndex = parseInt(active.id.toString().replace('restriction-', ''))
      const overIndex = parseInt(over?.id.toString().replace('restriction-', '') || '0')

      setFormData(prev => {
        const newRestrictions = arrayMove(prev.assignmentRestrictions, activeIndex, overIndex)

        // displayOrderを再計算
        const updatedRestrictions = newRestrictions.map((restriction, index) => ({
          ...restriction,
          displayOrder: index + 1,
        }))

        return {
          ...prev,
          assignmentRestrictions: updatedRestrictions,
        }
      })
    }
  }

  // 曜日に応じた授業数を取得
  const getPeriodsForDay = (day: string): number => {
    if (!schoolSettings) return 6
    return day === '土曜' ? schoolSettings.saturdayPeriods : schoolSettings.dailyPeriods
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side='right' className='sm:max-w-[700px] w-full overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>{teacher ? '教師情報を編集' : '新しい教師を追加'}</SheetTitle>
          <SheetDescription>教師の基本情報と担当科目・学年を設定してください</SheetDescription>
        </SheetHeader>

        <form
          onSubmit={e => {
            e.preventDefault()
            console.log('🔄 Form submission prevented, calling handleSave')
            handleSave()
          }}
        >
          <div className='space-y-4'>
            {/* 教師名 */}
            <div>
              <Label htmlFor='teacher-name'>教師名</Label>
              <Input
                id='teacher-name'
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder='教師名を入力'
              />
            </div>

            {/* 担当科目 */}
            <div>
              <Label>担当科目</Label>
              <div className='flex gap-2 mb-2'>
                <Select
                  value={selectedSubject}
                  onValueChange={handleSubjectSelect}
                  disabled={isLoadingSubjects}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingSubjects ? '読み込み中...' : '教科を選択'} />
                  </SelectTrigger>
                  <SelectContent className='z-[70]'>
                    {availableSubjects
                      .filter(subject => !formData.subjects.includes(subject.name))
                      .map(subject => (
                        <SelectItem key={subject.id || subject.name} value={subject.name}>
                          {subject.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleAddSubject}
                  size='sm'
                  disabled={!selectedSubject || isLoadingSubjects}
                >
                  <Plus className='w-4 h-4' />
                </Button>
              </div>
              <div className='flex flex-wrap gap-1'>
                {formData.subjects.map((subject) => (
                  <Badge key={subject} variant='secondary' className='cursor-pointer'>
                    {subject}
                    <button
                      type='button'
                      onClick={() => handleRemoveSubject(subject)}
                      className='ml-1 hover:text-red-500'
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 担当学年 */}
            <div>
              <Label>担当学年</Label>
              <div className='flex gap-2 mb-2'>
                <Select value={newGrade} onValueChange={handleGradeSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder='学年を選択' />
                  </SelectTrigger>
                  <SelectContent className='z-[70]'>
                    <SelectItem value='1年'>1年</SelectItem>
                    <SelectItem value='2年'>2年</SelectItem>
                    <SelectItem value='3年'>3年</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleAddGrade} size='sm'>
                  <Plus className='w-4 h-4' />
                </Button>
              </div>
              <div className='flex flex-wrap gap-1'>
                {formData.grades.map((grade) => (
                  <Badge key={grade} variant='outline' className='cursor-pointer'>
                    {grade}
                    <button
                      type='button'
                      onClick={() => handleRemoveGrade(grade)}
                      className='ml-1 hover:text-red-500'
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 割当制限 */}
            <div>
              <div className='flex items-center justify-between mb-2'>
                <Label>割当制限（非常勤講師用）</Label>
                <Button onClick={handleAddRestriction} size='sm' variant='outline'>
                  <Plus className='w-4 h-4 mr-1' />
                  制限を追加
                </Button>
              </div>

              {formData.assignmentRestrictions.length === 0 ? (
                <div className='text-sm text-gray-500 p-4 border border-dashed rounded-lg text-center'>
                  割当制限が設定されていません
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className='space-y-4 max-h-60 overflow-y-auto'>
                    <SortableContext
                      items={formData.assignmentRestrictions.map(
                        (_, index) => `restriction-${index}`
                      )}
                      strategy={verticalListSortingStrategy}
                    >
                      {formData.assignmentRestrictions.map((restriction, index) => (
                        <SortableRestrictionItem
                          key={restriction.id || `restriction-${index}`}
                          restriction={restriction}
                          index={index}
                          onUpdate={handleUpdateRestriction}
                          onRemove={handleRemoveRestriction}
                          onPeriodToggle={handlePeriodToggle}
                          getPeriodsForDay={getPeriodsForDay}
                        />
                      ))}
                    </SortableContext>
                  </div>
                </DndContext>
              )}
            </div>
          </div>
        </form>

        <SheetFooter className='mt-6'>
          <Button variant='outline' onClick={onClose}>
            キャンセル
          </Button>
          <Button
            onClick={handleSave}
            disabled={!formData.name.trim() || isSaving}
            data-testid='teacher-save-button'
            type='button'
          >
            <Save className='w-4 h-4 mr-2' />
            {teacher ? '更新' : '追加'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
