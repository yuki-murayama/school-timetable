import { useState } from "react"
import { Button } from "./ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { School } from "lucide-react"
import { useAuth } from "../hooks/use-auth"

export function LoginPage() {
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    setIsLoading(true)
    try {
      await login()
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <School className="w-8 h-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">時間割生成システム</CardTitle>
          <CardDescription>学校の時間割を効率的に生成・管理するシステムです</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Clerkを使用したセキュアな認証システムでログインしてください
            </p>
          </div>
          <Button 
            onClick={handleLogin} 
            className="w-full" 
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? "認証中..." : "ログイン"}
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            認証に関する問題がある場合は管理者にお問い合わせください
          </div>
        </CardContent>
      </Card>
    </div>
  )
}