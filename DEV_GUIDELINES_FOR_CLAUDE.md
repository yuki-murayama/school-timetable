# 🤖 Claude開発者向け専用ガイドライン

## 🚨 重要：プロセス管理の必須ルール

### ❌ 絶対に行ってはいけないこと

```bash
# ❌ 直接コマンド実行（ポート競合の原因）
npx wrangler dev
vite --config vite.frontend.config.ts
concurrently "vite" "wrangler dev"

# ❌ プロセス管理なしでの起動
npm run dev:frontend  # 古いプロセスが残っている状態
npm run dev:backend   # 古いプロセスが残っている状態
```

### ✅ 必ず行うべきこと

```bash
# ✅ 自動プロセス管理付きの統合開発環境
npm run dev           # 推奨：自動クリーンアップ付き
npm run dev:safe      # より安全：ポート確認付き
npm run dev:restart   # 問題時：完全再起動

# ✅ 問題発生時の対処
npm run dev:cleanup:all    # 全プロセス停止
npm run dev:check-ports    # ポート状況確認
npm run dev:help          # ヘルプ表示
```

## 🔧 プロセス競合問題の解決手順

### 1. 問題の症状
- `Address already in use` エラー
- ポート5173,5174,5175,5176,8787の競合
- 新しいプロセスが起動できない

### 2. 解決手順

```bash
# ステップ1: 現在の状況確認
npm run dev:check-ports

# ステップ2: 全プロセス停止
npm run dev:cleanup:all

# ステップ3: 2秒待機
sleep 2

# ステップ4: 新規起動
npm run dev
```

### 3. 自動化された解決

```bash
# 一発解決コマンド
npm run dev:restart
```

## 🎯 開発ワークフローのベストプラクティス

### 開発開始時

1. **必ず最初にクリーンアップ**
   ```bash
   npm run dev:cleanup:all
   ```

2. **ポート確認付きで安全起動**
   ```bash
   npm run dev:safe
   ```

### 開発中の切り替え

1. **フロントエンドのみ再起動**
   ```bash
   npm run dev:cleanup:frontend
   npm run dev:frontend
   ```

2. **バックエンドのみ再起動**
   ```bash
   npm run dev:cleanup:backend
   npm run dev:backend
   ```

### 開発終了時

```bash
# 全プロセス停止
npm run dev:cleanup:all
```

## 🚨 緊急時の対処法

### ポート競合で完全に動かない場合

```bash
# 手動でプロセス強制終了
sudo lsof -ti:5173,5174,5175,5176,5177,8787 | xargs -r sudo kill -9
sudo pkill -f 'vite'
sudo pkill -f 'wrangler'
sudo pkill -f 'concurrently'

# その後、通常の起動
npm run dev
```

## 📋 Claude向け開発チェックリスト

### ✅ 開発開始前
- [ ] `npm run dev:cleanup:all` でプロセスクリーンアップ
- [ ] `npm run dev:check-ports` でポート確認
- [ ] `npm run dev` または `npm run dev:safe` で起動

### ✅ 開発中
- [ ] 直接コマンド（`npx wrangler dev`等）は使用しない
- [ ] 必ずnpmスクリプト経由でプロセス管理
- [ ] 問題発生時は `npm run dev:restart` で解決

### ✅ 開発終了時
- [ ] `npm run dev:cleanup:all` で全プロセス停止
- [ ] バックグラウンドプロセスが残っていないか確認

## 💡 効率的な開発のためのヒント

### 1. エイリアスの活用
```bash
# よく使うコマンドの短縮形
alias d='npm run dev'
alias dr='npm run dev:restart'
alias dc='npm run dev:cleanup:all'
alias dp='npm run dev:check-ports'
```

### 2. 一発解決コマンド
```bash
# 問題が起きたら迷わずこれ
npm run dev:restart
```

### 3. 状況確認
```bash
# 何が起こっているか分からない時
npm run dev:help
npm run dev:check-ports
```

---

**このガイドラインを遵守することで、プロセス競合問題を完全に防ぐことができます。**