import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TableRow, TableCell } from "../ui/table"
import { GripVertical } from "lucide-react"

interface SortableRowProps {
  id: string
  children: React.ReactNode
}

export function SortableRow({ id, children }: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <TableRow
      ref={setNodeRef}
      style={style}
      className={isDragging ? "bg-gray-50" : ""}
    >
      <TableCell className="w-8">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>
      </TableCell>
      {children}
    </TableRow>
  )
}