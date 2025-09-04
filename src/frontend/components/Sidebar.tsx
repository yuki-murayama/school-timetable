import { ValidationError } from '@shared/schemas'
import { Calendar, Database, Eye, LogOut, Menu, School, X } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { cn } from '../lib/utils'
import { Button } from './ui/button'

// ページ種別検証スキーマ
const PageTypeSchema = z.union([z.literal('generate'), z.literal('data'), z.literal('view')])

// サイドバープロパティ検証スキーマ
const SidebarPropsSchema = z.object({
  currentPage: z.string(),
  onPageChange: z.function(z.tuple([z.string()]), z.void()),
  onLogout: z.function(z.tuple([]), z.void()),
})

interface SidebarProps {
  currentPage: string
  onPageChange: (page: string) => void
  onLogout: () => void
}

// メニューアイテム検証スキーマ
const MenuItemSchema = z.object({
  id: PageTypeSchema,
  label: z.string().min(1, 'ラベルは必須です'),
  icon: z.any(), // Lucide Reactアイコンコンポーネント
})

type MenuItem = z.infer<typeof MenuItemSchema>

export function Sidebar({ currentPage, onPageChange, onLogout }: SidebarProps) {
  // Props validation
  try {
    SidebarPropsSchema.parse({ currentPage, onPageChange, onLogout })
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Sidebar props validation failed:', error.errors)
      throw new ValidationError('サイドバーのプロパティ検証に失敗しました', error.errors)
    }
    throw error
  }

  const [isCollapsed, setIsCollapsed] = useState(false)

  // 型安全なメニューアイテム定義
  const menuItems: MenuItem[] = [
    { id: 'generate', label: '時間割生成', icon: Calendar },
    { id: 'data', label: 'データ登録', icon: Database },
    { id: 'view', label: '時間割参照', icon: Eye },
  ]

  // メニューアイテムの検証
  try {
    menuItems.forEach(item => MenuItemSchema.parse(item))
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Menu items validation failed:', error.errors)
      throw new ValidationError('メニューアイテムの検証に失敗しました', error.errors)
    }
    throw error
  }

  return (
    <div
      className={cn(
        'bg-white border-r border-gray-200 transition-all duration-300 flex flex-col',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className='p-4 border-b border-gray-200'>
        <div className='flex items-center justify-between'>
          {!isCollapsed && (
            <div className='flex items-center space-x-2'>
              <School className='w-6 h-6 text-primary' />
              <span className='font-semibold text-lg'>時間割システム</span>
            </div>
          )}
          <Button
            variant='ghost'
            size='sm'
            onClick={() => setIsCollapsed(!isCollapsed)}
            className='p-2'
          >
            {isCollapsed ? <Menu className='w-4 h-4' /> : <X className='w-4 h-4' />}
          </Button>
        </div>
      </div>

      <nav className='flex-1 p-4 space-y-2'>
        {menuItems.map(item => {
          const Icon = item.icon
          return (
            <Button
              key={item.id}
              data-testid={`sidebar-${item.id}-button`}
              variant={currentPage === item.id ? 'default' : 'ghost'}
              className={cn('w-full justify-start', isCollapsed && 'px-2')}
              onClick={() => {
                try {
                  const validatedId = PageTypeSchema.parse(item.id)
                  onPageChange(validatedId)
                } catch (error) {
                  if (error instanceof z.ZodError) {
                    console.error('Page change validation failed:', error.errors)
                    // エラーは静かに処理し、UIを壊さない
                  }
                }
              }}
            >
              <Icon className='w-4 h-4' />
              {!isCollapsed && <span className='ml-2'>{item.label}</span>}
            </Button>
          )
        })}
      </nav>

      <div className='p-4 border-t border-gray-200'>
        <Button
          data-testid='sidebar-logout-button'
          variant='ghost'
          className={cn(
            'w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50',
            isCollapsed && 'px-2'
          )}
          onClick={onLogout}
        >
          <LogOut className='w-4 h-4' />
          {!isCollapsed && <span className='ml-2'>ログアウト</span>}
        </Button>
      </div>
    </div>
  )
}
