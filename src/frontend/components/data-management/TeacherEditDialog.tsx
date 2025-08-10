import { Save } from 'lucide-react'
import { useEffect } from 'react'
import { useTeacherApi } from '../../hooks/use-teacher-api'
// モジュラー化されたフックとコンポーネントをインポート
import { useTeacherForm } from '../../hooks/use-teacher-form'
import type { Teacher } from '../../lib/api'
import { AssignmentRestrictionsManager } from '../teacher/AssignmentRestrictionsManager'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Checkbox } from '../ui/checkbox'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
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
  getFreshToken: () => Promise<string | null>
}

export function TeacherEditDialog({
  teacher,
  isOpen,
  onClose,
  onSave,
  token,
  getFreshToken,
}: TeacherEditDialogProps) {
  // フォーム管理フック
  const {
    name,
    selectedSubjects,
    selectedGrades,
    assignmentRestrictions,
    errors,
    setName,
    setAssignmentRestrictions,
    handleSubjectChange,
    handleGradeChange,
    validateForm,
    resetForm,
    getFormData,
  } = useTeacherForm(teacher)

  // API統合フック
  const { subjects, schoolSettings, isSaving, isLoading, saveTeacher, availableGrades } =
    useTeacherApi(token, getFreshToken)

  // ダイアログ閉じる時のクリーンアップ
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen, resetForm])

  // 保存処理
  const handleSave = async () => {
    console.log('🚀 handleSave called')
    console.log('📝 Form data:', { name, selectedSubjects, selectedGrades })
    
    const validationResult = validateForm()
    console.log('✅ Validation result:', validationResult)
    console.log('❌ Validation errors:', errors)
    
    if (!validationResult) {
      console.log('❌ Validation failed, not proceeding with save')
      return
    }

    try {
      const formData = getFormData()
      console.log('📦 Final form data:', formData)
      const isNewTeacher = !teacher?.id
      console.log('🆕 Is new teacher:', isNewTeacher)

      console.log('🔄 Calling saveTeacher API...')
      const result = await saveTeacher(formData, isNewTeacher)
      console.log('✅ API result:', result)
      onSave(result)
      onClose()
    } catch (error) {
      // エラーはuseTeacherApiフック内で処理済み
      console.error('保存処理でエラー:', error)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className='w-[600px] sm:w-[800px] overflow-y-auto'>
        <SheetHeader>
          <SheetTitle>{teacher ? '教師情報編集' : '新しい教師を追加'}</SheetTitle>
          <SheetDescription>
            教師の基本情報、担当教科、学年、割当制限を設定してください。
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <span>データを読み込み中...</span>
          </div>
        ) : (
          <div className='space-y-6 py-6'>
            {/* 基本情報 */}
            <div className='space-y-4'>
              <div>
                <Label htmlFor='teacher-name'>教師名 *</Label>
                <Input
                  id='teacher-name'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder='教師名を入力'
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className='text-sm text-red-500 mt-1'>{errors.name}</p>}
              </div>
            </div>

            {/* 担当教科 */}
            <div className='space-y-4'>
              <Label>担当教科 *</Label>
              {errors.subjects && <p className='text-sm text-red-500'>{errors.subjects}</p>}

              <div className='grid grid-cols-2 gap-2'>
                {subjects.map(subject => (
                  <div key={subject.id} className='flex items-center space-x-2'>
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={selectedSubjects.includes(subject.name)}
                      onCheckedChange={checked =>
                        handleSubjectChange(subject.name, checked as boolean)
                      }
                    />
                    <Label
                      htmlFor={`subject-${subject.id}`}
                      className='text-sm font-normal cursor-pointer'
                    >
                      {subject.name}
                    </Label>
                  </div>
                ))}
              </div>

              {selectedSubjects.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {selectedSubjects.map(subject => (
                    <Badge key={subject} variant='secondary' className='text-xs'>
                      {subject}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 担当学年 */}
            <div className='space-y-4'>
              <Label>担当学年 *</Label>
              {errors.grades && <p className='text-sm text-red-500'>{errors.grades}</p>}

              <div className='flex space-x-4'>
                {availableGrades.map(grade => (
                  <div key={grade} className='flex items-center space-x-2'>
                    <Checkbox
                      id={`grade-${grade}`}
                      checked={selectedGrades.includes(grade)}
                      onCheckedChange={checked => handleGradeChange(grade, checked as boolean)}
                    />
                    <Label htmlFor={`grade-${grade}`} className='cursor-pointer'>
                      {grade}年生
                    </Label>
                  </div>
                ))}
              </div>

              {selectedGrades.length > 0 && (
                <div className='flex flex-wrap gap-1 mt-2'>
                  {selectedGrades.map(grade => (
                    <Badge key={grade} variant='outline' className='text-xs'>
                      {grade}年生
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* 割当制限 */}
            <AssignmentRestrictionsManager
              restrictions={assignmentRestrictions}
              onRestrictionsChange={setAssignmentRestrictions}
              schoolSettings={schoolSettings}
            />
          </div>
        )}

        <SheetFooter>
          <Button variant='outline' onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button 
            data-testid="teacher-save-button"
            onClick={(e) => {
              console.log('🖱️ Save button clicked - event:', e)
              console.log('🖱️ isSaving:', isSaving, 'isLoading:', isLoading)
              console.log('🖱️ About to call handleSave...')
              handleSave()
            }} 
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <>
                <Save className='h-4 w-4 mr-2 animate-spin' />
                保存中...
              </>
            ) : (
              <>
                <Save className='h-4 w-4 mr-2' />
                保存
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
