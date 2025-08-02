import { useState, useEffect } from "react"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select"
import { Save } from "lucide-react"
import { type Classroom } from "../../lib/api"

interface ClassroomEditDialogProps {
  classroom: Classroom | null
  isOpen: boolean
  onClose: () => void
  onSave: (classroomData: Partial<Classroom>) => void
  token: string | null
}

interface ClassroomFormData {
  name: string
  type: string
  count: number
}

export function ClassroomEditDialog({
  classroom,
  isOpen,
  onClose,
  onSave,
  token,
}: ClassroomEditDialogProps) {
  const [formData, setFormData] = useState<ClassroomFormData>({
    name: "",
    type: "",
    count: 1
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (classroom) {
      setFormData({
        name: classroom.name,
        type: classroom.type || "",
        count: classroom.count || classroom.capacity || 1
      })
    } else {
      setFormData({ name: "", type: "", count: 1 })
    }
  }, [classroom])

  const handleSave = async () => {
    if (!token || !formData.name.trim() || !formData.type) return
    
    setIsSaving(true)
    try {
      await onSave(formData)
      onClose()
    } catch (error) {
      console.error("教室保存エラー:", error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent 
        side="right"
        className="sm:max-w-[500px] w-full overflow-y-auto"
      >
        <SheetHeader>
          <SheetTitle>
            {classroom ? "教室情報を編集" : "新しい教室を追加"}
          </SheetTitle>
          <SheetDescription>
            教室名、タイプ、数を設定してください
          </SheetDescription>
        </SheetHeader>
        
        <div className="space-y-4">
          {/* 教室名 */}
          <div>
            <Label htmlFor="classroom-name">教室名</Label>
            <Input
              id="classroom-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="例：理科室、音楽室、体育館"
            />
          </div>

          {/* 教室タイプ */}
          <div>
            <Label htmlFor="classroom-type">教室タイプ</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="タイプを選択" />
              </SelectTrigger>
              <SelectContent className="z-[70]">
                <SelectItem value="特別教室">特別教室</SelectItem>
                <SelectItem value="普通教室">普通教室</SelectItem>
                <SelectItem value="実験室">実験室</SelectItem>
                <SelectItem value="実習室">実習室</SelectItem>
                <SelectItem value="体育施設">体育施設</SelectItem>
                <SelectItem value="その他">その他</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 教室数 */}
          <div>
            <Label htmlFor="classroom-count">教室数</Label>
            <Input
              id="classroom-count"
              type="number"
              min="1"
              value={formData.count}
              onChange={(e) => setFormData(prev => ({ ...prev, count: Number.parseInt(e.target.value) || 1 }))}
              placeholder="教室の数"
            />
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!formData.name.trim() || !formData.type || isSaving}
          >
            <Save className="w-4 h-4 mr-2" />
            {classroom ? "更新" : "追加"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}