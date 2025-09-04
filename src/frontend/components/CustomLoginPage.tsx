import { Eye, EyeOff, School } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { useAuth } from '../contexts/AuthContext'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

// フォーム状態スキーマ
const LoginFormSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

type LoginForm = z.infer<typeof LoginFormSchema>

export function CustomLoginPage() {
  const { login, isLoading, error, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<LoginForm>({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 認証成功時のリダイレクト処理（ローディング完了後のみ）
  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      console.log('🔄 認証成功、メインページにリダイレクト中...', { user: user.email })
      // より長い遅延を入れて認証状態の完全同期を待つ
      const timer = setTimeout(() => {
        console.log('🚀 リダイレクト実行: /', { isAuthenticated, user: user.email })
        navigate('/', { replace: true })
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, isLoading, navigate, user])

  // フォーム値の更新
  const updateForm = (field: keyof LoginForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))

    // 入力時にバリデーションエラーをクリア
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  // フォームバリデーション
  const validateForm = (): boolean => {
    try {
      LoginFormSchema.parse(form)
      setValidationErrors({})
      return true
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {}
        error.errors.forEach(err => {
          const path = err.path[0] as string
          errors[path] = err.message
        })
        setValidationErrors(errors)
      }
      return false
    }
  }

  // ログイン処理
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    // フォームバリデーション
    if (!validateForm()) {
      return
    }

    try {
      const result = await login(form)

      if (result.success) {
        console.log('✅ ログイン成功、認証状態の同期を待機中...')
        // リダイレクト処理は useEffect に任せる
        // ここでは手動リダイレクトを行わない
      } else if (result.error) {
        // サーバーエラーを表示
        setValidationErrors({ general: result.error })
      }
    } catch (error) {
      console.error('ログインエラー:', error)
      setValidationErrors({ general: 'ログイン処理でエラーが発生しました' })
    }
  }

  // デモアカウント情報
  const demoAccounts = [
    { label: '管理者', email: 'admin@school.local', password: 'admin123' },
    { label: '教師', email: 'teacher@school.local', password: 'teacher123' },
    { label: 'テスト', email: 'test@school.local', password: 'password123' },
  ]

  // デモアカウントでの自動入力
  const fillDemoAccount = (email: string, password: string) => {
    setForm({ email, password })
    setValidationErrors({})
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md shadow-xl'>
        <CardHeader className='text-center space-y-4'>
          <div className='mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center'>
            <School className='w-8 h-8 text-primary-foreground' />
          </div>
          <CardTitle className='text-2xl font-bold'>時間割生成システム</CardTitle>
          <CardDescription>学校の時間割を効率的に生成・管理するシステムです</CardDescription>
        </CardHeader>

        <CardContent className='space-y-6'>
          <form onSubmit={handleLogin} className='space-y-4'>
            {/* 全般エラー表示 */}
            {(validationErrors.general || error) && (
              <div className='p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md'>
                {validationErrors.general || error}
              </div>
            )}

            {/* メールアドレス */}
            <div className='space-y-2'>
              <Label htmlFor='email'>メールアドレス</Label>
              <Input
                id='email'
                type='email'
                placeholder='user@school.local'
                value={form.email}
                onChange={e => updateForm('email', e.target.value)}
                className={validationErrors.email ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {validationErrors.email && (
                <p className='text-sm text-red-600'>{validationErrors.email}</p>
              )}
            </div>

            {/* パスワード */}
            <div className='space-y-2'>
              <Label htmlFor='password'>パスワード</Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='パスワードを入力'
                  value={form.password}
                  onChange={e => updateForm('password', e.target.value)}
                  className={validationErrors.password ? 'border-red-500 pr-10' : 'pr-10'}
                  disabled={isLoading}
                />
                <button
                  type='button'
                  onClick={() => setShowPassword(!showPassword)}
                  className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700'
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                </button>
              </div>
              {validationErrors.password && (
                <p className='text-sm text-red-600'>{validationErrors.password}</p>
              )}
            </div>

            {/* ログインボタン */}
            <Button type='submit' className='w-full' size='lg' disabled={isLoading}>
              {isLoading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>

          {/* デモアカウント */}
          <div className='space-y-3'>
            <div className='text-center'>
              <p className='text-sm text-muted-foreground'>デモアカウント</p>
            </div>
            <div className='grid gap-2'>
              {demoAccounts.map(account => (
                <Button
                  key={account.email}
                  variant='outline'
                  size='sm'
                  onClick={() => fillDemoAccount(account.email, account.password)}
                  disabled={isLoading}
                  className='text-xs justify-start'
                >
                  <span className='font-medium w-12'>{account.label}:</span>
                  <span className='text-muted-foreground'>{account.email}</span>
                </Button>
              ))}
            </div>
          </div>

          <div className='text-center text-sm text-muted-foreground'>
            認証に関する問題がある場合は管理者にお問い合わせください
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
