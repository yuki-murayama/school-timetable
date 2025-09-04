import type { Subject } from '@shared/schemas'
import { Save } from 'lucide-react'
import { useEffect } from 'react'
import { useSubjectApi } from '../../hooks/use-subject-api'
// モジュラー化されたフックをインポート
import { useSubjectForm } from '../../hooks/use-subject-form'
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

export function SubjectEditDialog({
  subject,
  isOpen,
  onClose,
  onSave,
  token,
  getFreshToken,
}: SubjectEditDialogProps) {
  // フォーム管理フック
  const { formData, errors, handleGradeChange, updateField, validateForm, resetForm, getFormData } =
    useSubjectForm(subject)

  // API統合フック
  const { classrooms, isSaving, isLoading, saveSubject } = useSubjectApi(token, getFreshToken)

  // ダイアログ閉じる時のクリーンアップ
  useEffect(() => {
    if (!isOpen) {
      resetForm()
    }
  }, [isOpen, resetForm])

  // 保存処理
  const handleSave = async () => {
    if (!validateForm()) return

    try {
      const apiData = getFormData()
      const isNewSubject = !subject?.id

      const result = await saveSubject(apiData, isNewSubject)
      onSave(result)
      onClose()
    } catch (error) {
      // エラーはuseSubjectApiフック内で処理済み
      console.error('保存処理でエラー:', error)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side='right'
        className='sm:max-w-[500px] w-full overflow-y-auto'
        role='dialog'
        data-testid='subject-edit-dialog'
      >
        <SheetHeader>
          <SheetTitle>{subject ? '教科情報を編集' : '新しい教科を追加'}</SheetTitle>
          <SheetDescription>
            教科名、対象学年、専用教室、1週間の授業数を設定してください
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className='flex items-center justify-center py-8'>
            <span>データを読み込み中...</span>
          </div>
        ) : (
          <div className='space-y-4'>
            {/* 教科名 */}
            <div>
              <Label htmlFor='subject-name'>教科名 *</Label>
              <Input
                id='subject-name'
                value={formData.name}
                onChange={e => updateField('name', e.target.value)}
                placeholder='教科名を入力'
                className={errors.name ? 'border-red-500' : ''}
              />
              {errors.name && <p className='text-sm text-red-500 mt-1'>{errors.name}</p>}
            </div>

            {/* 対象学年 */}
            <div data-testid='grade-selection-section'>
              <Label>対象学年 *</Label>
              {errors.target_grades && (
                <p className='text-sm text-red-500'>{errors.target_grades}</p>
              )}

              <div className='flex flex-col gap-2 mt-2'>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='grade-1'
                    data-testid='grade-1-checkbox'
                    checked={formData.target_grades.includes(1)}
                    onCheckedChange={(checked: boolean) => handleGradeChange(1, checked)}
                  />
                  <Label htmlFor='grade-1' className='cursor-pointer'>
                    1年生
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='grade-2'
                    data-testid='grade-2-checkbox'
                    checked={formData.target_grades.includes(2)}
                    onCheckedChange={(checked: boolean) => handleGradeChange(2, checked)}
                  />
                  <Label htmlFor='grade-2' className='cursor-pointer'>
                    2年生
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <Checkbox
                    id='grade-3'
                    data-testid='grade-3-checkbox'
                    checked={formData.target_grades.includes(3)}
                    onCheckedChange={(checked: boolean) => handleGradeChange(3, checked)}
                  />
                  <Label htmlFor='grade-3' className='cursor-pointer'>
                    3年生
                  </Label>
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  選択しない場合は全学年が対象となります
                </p>
              </div>
            </div>

            {/* 専用教室 */}
            <div>
              <Label htmlFor='special-classroom'>専用教室（任意）</Label>
              {classrooms.length > 0 && !isLoading ? (
                <Select
                  value={formData.specialClassroom || 'none'}
                  onValueChange={value =>
                    updateField('specialClassroom', value === 'none' ? '' : value)
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
                  onChange={e => updateField('specialClassroom', e.target.value)}
                  placeholder={isLoading ? '教室情報を読み込み中...' : '例：理科室、音楽室、体育館'}
                  disabled={isLoading}
                />
              )}
            </div>

            {/* 1週間の授業数 */}
            <div>
              <Label htmlFor='weekly-lessons'>1週間の授業数 *</Label>
              <Input
                id='weekly-lessons'
                type='number'
                min='1'
                max='10'
                value={formData.weekly_hours}
                onChange={e => updateField('weekly_hours', Number.parseInt(e.target.value) || 1)}
                placeholder='週に何回授業を行うか'
                className={errors.weekly_hours ? 'border-red-500' : ''}
              />
              {errors.weekly_hours && (
                <p className='text-sm text-red-500 mt-1'>{errors.weekly_hours}</p>
              )}
              <p className='text-xs text-muted-foreground mt-1'>
                例：数学=6回、英語=4回、音楽=1回、体育=3回
              </p>
            </div>
          </div>
        )}

        <SheetFooter className='mt-6'>
          <Button variant='outline' onClick={onClose} disabled={isSaving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoading}>
            {isSaving ? (
              <>
                <Save className='h-4 w-4 mr-2 animate-spin' />
                保存中...
              </>
            ) : (
              <>
                <Save className='w-4 h-4 mr-2' />
                {subject ? '更新' : '追加'}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
