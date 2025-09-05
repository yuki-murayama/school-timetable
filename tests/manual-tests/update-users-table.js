// usersテーブル構造更新スクリプト
async function updateUsersTable() {
  try {
    // 1. usersテーブルを削除
    let response = await fetch('http://localhost:35323/api/test-drop-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    console.log('Drop users table:', response.status)

    // 2. データベース再初期化
    response = await fetch('http://localhost:35323/api/init-db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const result = await response.json()
    console.log('Database re-initialization result:', result)
    return result
  } catch (error) {
    console.error('Error updating users table:', error)
    return { success: false, error: error.message }
  }
}

updateUsersTable().then(() => process.exit(0))
