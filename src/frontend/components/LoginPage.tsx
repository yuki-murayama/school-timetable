import { ValidationError } from '@shared/schemas'
import { Eye, EyeOff, School } from 'lucide-react'
import { useState } from 'react'
import { z } from 'zod'
import { useAuth } from '../hooks/use-auth'
import { Button } from './ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'
import { Label } from './ui/label'

// ログインフォームスキーマ
const LoginFormSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z.string().min(1, 'パスワードを入力してください'),
})

const LoginStateSchema = z.object({
  isLoading: z.boolean(),
  error: z.string().optional(),
})

type LoginForm = z.infer<typeof LoginFormSchema>

export function LoginPage() {
  const { login } = useAuth()
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [showPassword, setShowPassword] = useState(false)

  const handleInputChange =
    (field: keyof LoginForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: e.target.value,
      }))
      // エラーをクリア
      if (error) setError('')
    }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // フォームデータの検証
      const validatedData = LoginFormSchema.parse(formData)

      // ローディング状態の型安全な更新
      const loadingState = LoginStateSchema.parse({ isLoading: true })
      setIsLoading(loadingState.isLoading)
      setError('')

      // ログイン実行
      const result = await login(validatedData)

      if (!result.success) {
        setError(result.error || 'ログインに失敗しました')
      }
    } catch (error) {
      console.error('Login failed:', error)
      if (error instanceof z.ZodError) {
        setError(error.errors[0]?.message || 'フォームの入力に誤りがあります')
      } else if (error instanceof ValidationError) {
        setError(error.message)
      } else {
        setError('ログインに失敗しました')
      }
    } finally {
      try {
        const completedState = LoginStateSchema.parse({ isLoading: false })
        setIsLoading(completedState.isLoading)
      } catch (_validationError) {
        setIsLoading(false)
      }
    }
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
          <form onSubmit={handleSubmit} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='email'>メールアドレス</Label>
              <Input
                id='email'
                type='email'
                placeholder='メールアドレスを入力'
                value={formData.email}
                onChange={handleInputChange('email')}
                required
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password'>パスワード</Label>
              <div className='relative'>
                <Input
                  id='password'
                  type={showPassword ? 'text' : 'password'}
                  placeholder='パスワードを入力'
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  required
                />
                <button
                  type='button'
                  className='absolute right-3 top-1/2 transform -translate-y-1/2'
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className='h-4 w-4 text-gray-500' />
                  ) : (
                    <Eye className='h-4 w-4 text-gray-500' />
                  )}
                </button>
              </div>
            </div>

            {error && <div className='text-sm text-red-600 bg-red-50 p-3 rounded'>{error}</div>}

            <Button type='submit' className='w-full' size='lg' disabled={isLoading}>
              {isLoading ? '認証中...' : 'ログイン'}
            </Button>
          </form>

          <div className='text-center text-sm text-muted-foreground'>
            セキュアな認証システムでログインしてください
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
