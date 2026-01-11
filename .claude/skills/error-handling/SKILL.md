# Error Handling & API Reliability Skill

## 概要
dropletterプロジェクトでAPIリクエストのエラーを適切に処理し、信頼性を向上させるためのガイドライン。

## よくあるエラーと対処法

### 1. Failed to fetch / ERR_CONNECTION_RESET

**症状**:
```
Failed to load resource: net::ERR_CONNECTION_RESET
TypeError: Failed to fetch
```

**原因**:
- サーバーが起動していない
- サーバーが過負荷
- ネットワーク接続の問題
- リクエストサイズが大きすぎる

**対処法**:
1. サーバーが起動しているか確認: `lsof -i :3000 | grep LISTEN`
2. リトライロジックを実装
3. 同時リクエスト数を制限

### 2. 400 Bad Request

**症状**:
```
Failed to load resource: the server responded with a status of 400 (Bad Request)
```

**原因**:
- リクエストボディが不正
- 必須パラメータが欠落
- ファイル形式が不正

**対処法**:
1. APIルートでFormData解析にtry-catchを追加
2. 詳細なエラーログを出力
3. クライアント側でバリデーション

### 3. 500 Internal Server Error

**原因**:
- サーバー側の予期せぬエラー
- データベース接続エラー
- 外部API呼び出し失敗

**対処法**:
1. サーバーログを確認
2. 各処理ステップにtry-catchを追加
3. リトライロジックを実装

## リトライロジックの実装

### クライアント側（推奨パターン）

```typescript
// リトライ設定
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// 遅延関数
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// リトライ付きfetch
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries: number = MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, options)
      // 400エラーはリトライしない（クライアント側の問題）
      if (response.status >= 400 && response.status < 500) {
        return response
      }
      // 成功またはサーバーエラー以外
      if (response.ok) {
        return response
      }
      // サーバーエラーの場合はリトライ
      console.warn(`Attempt ${attempt} failed with status ${response.status}`)
      lastError = new Error(`HTTP ${response.status}`)
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    // 最後の試行でなければ待機してリトライ
    if (attempt < retries) {
      await delay(RETRY_DELAY_MS * attempt) // 指数バックオフ
    }
  }

  throw lastError || new Error("リクエストに失敗しました")
}
```

### 使用例

```typescript
// リトライ付きでアップロード
const response = await fetchWithRetry("/api/upload", {
  method: "POST",
  body: formData,
})
```

## APIルートのエラーハンドリング

### 推奨パターン

```typescript
export async function POST(req: NextRequest) {
  console.log("[API] リクエスト受信")

  try {
    // FormDataの解析（try-catchで囲む）
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (formError) {
      console.error("[API] FormData解析エラー:", formError)
      return NextResponse.json(
        { success: false, error: "リクエストの解析に失敗しました" },
        { status: 400 }
      )
    }

    // バリデーション
    const file = formData.get("file") as File | null
    if (!file) {
      console.error("[API] ファイルが見つかりません")
      return NextResponse.json(
        { success: false, error: "ファイルが見つかりません" },
        { status: 400 }
      )
    }

    console.log(`[API] ファイル受信: ${file.name}, サイズ: ${file.size}`)

    // 処理（各ステップをtry-catchで囲む）
    try {
      // ファイル処理
    } catch (processError) {
      console.error("[API] 処理エラー:", processError)
      return NextResponse.json(
        { success: false, error: "処理に失敗しました" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[API] 予期せぬエラー:", error)
    return NextResponse.json(
      { success: false, error: "予期せぬエラーが発生しました" },
      { status: 500 }
    )
  }
}
```

## API Route設定

### Next.js App Router

```typescript
// 最大実行時間（秒）
export const maxDuration = 60

// 動的ルート（キャッシュしない）
export const dynamic = "force-dynamic"
```

### ボディサイズ制限

`next.config.js`:
```javascript
experimental: {
  serverActions: {
    bodySizeLimit: '10mb',
  },
},
```

## ログ出力のベストプラクティス

### 推奨フォーマット

```typescript
// プレフィックスを付けて出力
console.log("[Upload] リクエスト受信")
console.log(`[Upload] ファイル: ${file.name}, サイズ: ${file.size}`)
console.error("[Upload] エラー:", error)
console.warn("[Upload] 警告: ...")
```

### 出力すべき情報

1. **リクエスト受信時**: タイムスタンプ、エンドポイント
2. **処理開始時**: 入力パラメータ
3. **処理完了時**: 結果サマリー
4. **エラー時**: エラーメッセージ、スタックトレース

## チェックリスト

新しいAPIルートを作成する際:

- [ ] FormData/JSONの解析にtry-catchを追加
- [ ] 各処理ステップにtry-catchを追加
- [ ] 詳細なログ出力を追加
- [ ] 適切なHTTPステータスコードを返す
- [ ] `maxDuration`と`dynamic`を設定
- [ ] クライアント側にリトライロジックを実装

## 参考

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Fetch API Error Handling](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)
