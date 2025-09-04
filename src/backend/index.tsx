// レガシーAPIは廃止されました。統一APIを使用してください。
import { Hono } from 'hono'

const app = new Hono()

// すべてのレガシーAPIリクエストに対して廃止通知を返す
app.all('*', c => {
  return c.json(
    {
      success: false,
      error: 'API_DEPRECATED',
      message: 'レガシーAPIは廃止されました。統一API (/api/統一/*) を使用してください。',
    },
    410
  )
})

export default app
