# DropLetter デプロイメントガイド

## 概要

DropLetterは以下のサービスを使用してデプロイします：

| サービス | 用途 | 料金目安 |
|---------|------|---------|
| **Vercel** | Next.js ホスティング | 無料〜 |
| **Supabase** | PostgreSQL + Auth | 無料〜 |
| **Inngest** | バックグラウンドジョブ | 無料〜 |
| **Anthropic** | Claude API | 従量課金 |
| **Groq** | LLM API | 無料〜 |
| **LlamaCloud** | PDF解析 | 無料〜 |

---

## 1. 事前準備

### 必要なアカウント

1. **GitHub** - ソースコード管理
2. **Vercel** - https://vercel.com
3. **Supabase** - https://supabase.com
4. **Inngest** - https://inngest.com
5. **Anthropic** - https://console.anthropic.com
6. **Groq** - https://console.groq.com
7. **LlamaCloud** - https://cloud.llamaindex.ai

---

## 2. Supabase セットアップ

### 2.1 プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 「New Project」をクリック
3. プロジェクト名: `dropletter-prod`
4. リージョン: `Northeast Asia (Tokyo)` 推奨
5. データベースパスワードを設定（安全な場所に保存）

### 2.2 データベースマイグレーション

SQL Editorで以下を順番に実行：

```sql
-- 1. reportsテーブル作成
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name TEXT NOT NULL,
  file_path TEXT,
  status TEXT DEFAULT 'pending',
  result_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON reports FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON reports FOR UPDATE USING (true);

-- 2. ジョブトラッキング用カラム追加
ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_id TEXT;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE reports ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS idx_reports_file_id ON reports(file_id);
```

### 2.3 API Keys 取得

1. Project Settings → API に移動
2. 以下をコピー:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 3. Inngest セットアップ

### 3.1 アカウント作成

1. [Inngest Cloud](https://app.inngest.com) にサインアップ
2. 新しいアプリを作成

### 3.2 API Keys 取得

1. Settings → Signing Key をコピー → `INNGEST_SIGNING_KEY`
2. Settings → Event Key をコピー → `INNGEST_EVENT_KEY`

---

## 4. 外部API Keys 取得

### 4.1 Anthropic (Claude)

1. [Anthropic Console](https://console.anthropic.com) にログイン
2. API Keys → Create Key
3. コピー → `ANTHROPIC_API_KEY`

### 4.2 Groq

1. [Groq Console](https://console.groq.com) にログイン
2. API Keys → Create API Key
3. コピー → `GROQ_API_KEY`

### 4.3 LlamaCloud

1. [LlamaCloud](https://cloud.llamaindex.ai) にログイン
2. API Keys → Create Key
3. コピー → `LLAMA_CLOUD_API_KEY`

---

## 5. Vercel デプロイ

### 5.1 GitHubリポジトリ接続

1. [Vercel Dashboard](https://vercel.com/dashboard) にログイン
2. 「Add New」→「Project」
3. GitHubリポジトリ `dropletter` を選択
4. 「Import」をクリック

### 5.2 環境変数設定

「Environment Variables」セクションで以下を設定：

```
ANTHROPIC_API_KEY=sk-ant-...
GROQ_API_KEY=gsk_...
LLAMA_CLOUD_API_KEY=llx-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=signkey-...
```

### 5.3 ビルド設定

- Framework Preset: `Next.js`
- Build Command: `npm run build`
- Output Directory: `.next`
- Install Command: `npm install`

### 5.4 デプロイ

1. 「Deploy」をクリック
2. ビルドログを確認
3. 成功したらURLが発行される（例: `https://dropletter.vercel.app`）

---

## 6. Inngest 本番接続

### 6.1 Vercel Integration

1. Inngest Dashboard → Settings → Integrations
2. 「Vercel」を選択
3. Vercelアカウントと連携
4. プロジェクト `dropletter` を選択

### 6.2 手動設定（Integrationが使えない場合）

1. Vercelの環境変数に `INNGEST_SIGNING_KEY` と `INNGEST_EVENT_KEY` を設定済みか確認
2. デプロイ後、Inngest Dashboardで関数が登録されていることを確認
3. 関数一覧に `document/process` が表示されればOK

---

## 7. ドメイン設定（オプション）

### 7.1 カスタムドメイン

1. Vercel Dashboard → Project → Settings → Domains
2. 「Add」でドメインを追加（例: `dropletter.jp`）
3. DNSレコードを設定：
   - Type: `CNAME`
   - Name: `@` または サブドメイン
   - Value: `cname.vercel-dns.com`

### 7.2 SSL証明書

Vercelが自動的にLet's Encrypt証明書を発行します。

---

## 8. 動作確認

### 8.1 基本確認

```bash
# ヘルスチェック
curl https://your-domain.vercel.app/api/health

# Inngest接続確認
curl https://your-domain.vercel.app/api/inngest
```

### 8.2 機能テスト

1. ブラウザでアクセス
2. PDFファイルをアップロード
3. 処理が完了することを確認
4. Inngest Dashboardで実行ログを確認

---

## 9. 監視・運用

### 9.1 Vercel Analytics

1. Project → Analytics → Enable
2. Web Vitals、関数実行時間を監視

### 9.2 Inngest Monitoring

1. Inngest Dashboard → Functions
2. 実行履歴、エラー率を確認

### 9.3 Supabase Monitoring

1. Supabase Dashboard → Reports
2. データベース使用量、API呼び出し数を確認

---

## 10. トラブルシューティング

### ビルドエラー

```bash
# ローカルでビルドテスト
npm run build

# TypeScriptエラー確認
npx tsc --noEmit
```

### Inngest関数が登録されない

1. `/api/inngest/route.ts` が存在するか確認
2. `INNGEST_SIGNING_KEY` が正しいか確認
3. Vercelログで登録リクエストを確認

### PDF処理が失敗する

1. Inngest Dashboardで実行ログを確認
2. `LLAMA_CLOUD_API_KEY` が有効か確認
3. Supabaseのストレージ設定を確認

---

## 11. セキュリティチェックリスト

- [ ] 環境変数がGitHubにコミットされていないこと
- [ ] `.env.local` が `.gitignore` に含まれていること
- [ ] Supabase RLSポリシーが適切に設定されていること
- [ ] APIキーに適切な権限スコープが設定されていること
- [ ] 本番環境でデバッグログが無効化されていること

---

## 12. 料金見積もり（月額）

| サービス | 無料枠 | 超過時の目安 |
|---------|--------|-------------|
| Vercel | 100GB帯域、無制限デプロイ | $20〜 |
| Supabase | 500MB DB、2GB帯域 | $25〜 |
| Inngest | 25,000実行/月 | $0.001/実行 |
| Anthropic | なし | $3/100万トークン |
| Groq | 無料枠あり | 従量課金 |
| LlamaCloud | 無料枠あり | 従量課金 |

**小規模運用（〜1000PDF/月）**: 無料〜$50程度
**中規模運用（〜10000PDF/月）**: $100〜$300程度

---

## 次のステップ

1. [ ] 利用規約・プライバシーポリシーの作成
2. [ ] Google Analytics / Mixpanel の設定
3. [ ] エラー監視（Sentry）の設定
4. [ ] バックアップ戦略の策定
