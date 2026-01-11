# Server Management Skill

## 概要
dropletterプロジェクトの開発・テスト時に必要な全サーバーを起動・管理するスキル。

## 必須サーバー

### 1. Next.js Development Server
- **ポート**: 3000
- **起動コマンド**: `npm run dev`
- **用途**: フロントエンドUI、API Routes、Server Actions
- **確認コマンド**: `lsof -i :3000 | grep LISTEN`

### 2. Inngest Dev Server
- **ポート**: 8288
- **起動コマンド**: `./node_modules/.bin/inngest-cli dev -u http://localhost:3000/api/inngest`
- **用途**: バックグラウンドジョブ処理、PDF解析パイプライン
- **確認コマンド**: `lsof -i :8288 | grep LISTEN`
- **UI**: http://localhost:8288 でジョブ状況を確認可能

## 起動手順

### 全サーバー起動（テスト前に必須）

```bash
# 1. Inngest Dev Server をバックグラウンドで起動
./node_modules/.bin/inngest-cli dev -u http://localhost:3000/api/inngest &

# 2. 8秒待機してInngestの起動を確認
sleep 8
lsof -i :8288 | grep LISTEN

# 3. Next.js をバックグラウンドで起動
npm run dev &

# 4. 10秒待機してNext.jsの起動を確認
sleep 10
lsof -i :3000 | grep LISTEN

# 5. Inngest統合の確認
curl -s http://localhost:3000/api/inngest | grep function_count
```

### 起動状態の確認

```bash
# 両方のサーバーが起動しているか確認
lsof -i :3000 | grep LISTEN && lsof -i :8288 | grep LISTEN && echo "All servers running"

# Inngest関数の登録状況を確認（3つの関数が登録されていれば正常）
curl -s http://localhost:3000/api/inngest
# Expected: {"function_count":3,"mode":"dev",...}
```

## エラーと対処法

### ERR_CONNECTION_REFUSED (ポート3000)
- **原因**: Next.jsが起動していない
- **対処**: `npm run dev` を実行

### 「キュー待ち」から進まない / fetch failed
- **原因**: Inngest Dev Serverが起動していない
- **対処**: `./node_modules/.bin/inngest-cli dev -u http://localhost:3000/api/inngest` を実行

### ChunkLoadError
- **原因**: Next.jsのキャッシュ問題またはビルドエラー
- **対処**:
  1. Next.jsを停止: `kill $(lsof -i :3000 -t)`
  2. キャッシュ削除: `rm -rf .next`
  3. 再起動: `npm run dev`

### Inngest Event Key Error (401)
- **原因**: ローカル開発なのにCloud APIに接続しようとしている
- **対処**: `inngest/client.ts` で `isDev: true` が設定されているか確認

## PDF処理パイプライン

Inngestで実行される処理フロー：
```
[Upload] → [visual-parse] → [pii-masking] → [fast-check] → [deep-reason] → [Complete]
```

各ステップはInngest UIで進捗を確認可能。

## 注意事項

- **テスト前**: 必ず両サーバーの起動を確認すること
- **サーバー再起動時**: Inngestを先に起動し、その後Next.jsを起動（順序重要）
- **ポート競合**: 既存プロセスがポートを使用している場合は `kill $(lsof -i :PORT -t)` で停止
