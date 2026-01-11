# Claude Code Instructions for dropletter

## Server Startup (CRITICAL)

**テスト・動作確認を行う前に、以下のサーバーを必ず起動すること。**

### 必須サーバー

| サーバー | ポート | 起動コマンド |
|---------|--------|-------------|
| Inngest Dev | 8288 | `./node_modules/.bin/inngest-cli dev -u http://localhost:3000/api/inngest` |
| Next.js | 3000 | `npm run dev` |

### 起動確認

```bash
# 両サーバーが起動しているか確認
lsof -i :3000 | grep LISTEN  # Next.js
lsof -i :8288 | grep LISTEN  # Inngest
```

### 起動手順（推奨）

1. **Inngestを先に起動** (バックグラウンド):
   ```bash
   ./node_modules/.bin/inngest-cli dev -u http://localhost:3000/api/inngest &
   sleep 8
   ```

2. **Next.jsを起動** (バックグラウンド):
   ```bash
   npm run dev &
   sleep 10
   ```

3. **統合確認**:
   ```bash
   curl -s http://localhost:3000/api/inngest | grep function_count
   # Expected: "function_count":3
   ```

### よくあるエラー

- `ERR_CONNECTION_REFUSED`: Next.jsが起動していない
- `fetch failed` / `キュー待ち`: Inngestが起動していない
- `ChunkLoadError`: `rm -rf .next && npm run dev` でキャッシュクリア

## PDF処理パイプライン

```
Upload → visual-parse → pii-masking → fast-check → deep-reason → Complete
```

Inngest UI (http://localhost:8288) でジョブ状況を確認可能。

## 環境変数

必須の環境変数（`.env.local`）:
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `LLAMA_CLOUD_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
