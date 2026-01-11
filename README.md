# dropletter

自律型AIエージェントを活用したドキュメント処理システム

## 📚 Documentation Setup

このプロジェクトでは、以下のドキュメントをCursorの `@Docs` に登録することを推奨します。

### Cursor Docsへの登録方法

1. **Cursor Settings を開く**: `Cmd + ,` (macOS)
2. **Features** タブをクリック
3. **Docs** セクションで **"Add new doc"** をクリック
4. 下記のURLを1つずつ追加

---

### 🧠 A. 脳・自律エージェント (The Brain)

| ライブラリ | 概要 | Docs URL |
|-----------|------|----------|
| Claude Agent SDK | エージェントの自律動作、Skills定義の核心 | https://github.com/anthropics/claude-agent-sdk-typescript |
| Anthropic API | Claude 3.5 Sonnet を呼び出すための基本仕様 | https://docs.anthropic.com/en/api/getting-started |
| Groq Cloud | Llama 3 を「爆速」で動かすためのAPI仕様 | https://console.groq.com/docs/quickstart |

---

### 🎨 B. 身体・インターフェース (The Body)

| ライブラリ | 概要 | Docs URL |
|-----------|------|----------|
| Vercel AI SDK | Next.js上でAIの思考プロセスを可視化する基盤 | https://sdk.vercel.ai/docs |
| Next.js (App Router) | フレームワークの最新仕様 (Server Actions等) | https://nextjs.org/docs |
| Shadcn UI | 美しく機能的なUIコンポーネント集 | https://ui.shadcn.com/docs |
| Framer Motion | 「吸い込まれるような」アニメーション実装 | https://www.framer.com/motion/ |

---

### 🛡️ C. 特殊能力・防御壁 (The Moat)

| ライブラリ | 概要 | Docs URL |
|-----------|------|----------|
| LlamaParse | PDFを画像として解析し、構造化データにする (特許回避) | https://docs.cloud.llamaindex.ai/llama_parse/getting_started |
| Inngest | 複数ファイルの並列処理・キューイング制御 | https://www.inngest.com/docs |
| Liveblocks | リアルタイムコラボレーション (コメント・同期) | https://liveblocks.io/docs |
| Microsoft Presidio | 個人情報 (PII) の自動検知・マスキング仕様 | https://microsoft.github.io/presidio/ |

---

## 🚀 Quick Start

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

## 📝 チャット中の活用方法

Cursor AIチャット中に以下のように使用できます：

- `@Docs` - 登録したドキュメント全体を参照
- 特定のライブラリについて質問する際、ドキュメント名を明示すると精度が上がります

例:
```
"Vercel AI SDKを使って、Claude 3.5 Sonnetからのストリーミングレスポンスを実装して"
```

---

## 🏗️ Architecture

詳細なアーキテクチャとコーディングガイドラインは [.cursorrules](./.cursorrules) を参照してください。

## 📄 License

MIT
