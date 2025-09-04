// レガシーAPIは廃止されました。新しい統一APIを使用してください。
import { Hono } from 'hono'

const schoolRoutes = new Hono()

// すべてのレガシーAPIリクエストに対して廃止通知を返す
schoolRoutes.all('*', c => {
  return c.json(
    {
      success: false,
      error: 'API_DEPRECATED',
      message: 'レガシーAPIは廃止されました。新しい統一API (/api/*) を使用してください。',
    },
    410
  )
})

export default schoolRoutes
