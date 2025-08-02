import { useState } from "react"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"
import { Calendar, Database, Eye, LogOut, Menu, School, X } from "lucide-react"

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  onLogout: () => void
}

export function Sidebar({ currentPage, onPageChange, onLogout }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const menuItems = [
    { id: "generate", label: "時間割生成", icon: Calendar },
    { id: "data", label: "データ登録", icon: Database },
    { id: "view", label: "時間割参照", icon: Eye },
  ]

  return (
    <div
      className={cn(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        isCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <School className="w-6 h-6 text-primary" />
              <span className="font-semibold text-lg">時間割システム</span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setIsCollapsed(!isCollapsed)} className="p-2">
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              variant={currentPage === item.id ? "default" : "ghost"}
              className={cn("w-full justify-start", isCollapsed && "px-2")}
              onClick={() => onPageChange(item.id)}
            >
              <Icon className="w-4 h-4" />
              {!isCollapsed && <span className="ml-2">{item.label}</span>}
            </Button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className={cn("w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50", isCollapsed && "px-2")}
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && <span className="ml-2">ログアウト</span>}
        </Button>
      </div>
    </div>
  )
}