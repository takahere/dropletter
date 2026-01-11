# Visual Parse Skill

## Overview
LlamaParse を使用したPDF解析スキル。
OCRを使用せず、PDFを視覚的に解析してMarkdown形式に変換します。

## Model
- Provider: LlamaCloud
- Service: LlamaParse
- Method: Visual Analysis (NOT OCR)

## Key Features
- **OCR不使用**: 画像認識ベースの解析でテキストを抽出
- **構造保持**: 表、リスト、見出しなどの構造を維持
- **高精度**: 手書き文字や複雑なレイアウトにも対応

## Input
```typescript
interface VisualParseInput {
  file: File | Buffer | string  // PDF ファイル、バッファ、またはURL
  options?: {
    language?: string           // 言語 (default: "ja")
    preserveLayout?: boolean    // レイアウト保持 (default: true)
  }
}
```

## Output
```typescript
interface VisualParseOutput {
  markdown: string              // Markdown形式のテキスト
  metadata: {
    pageCount: number           // ページ数
    title?: string              // ドキュメントタイトル
    author?: string             // 著者
    createdAt?: string          // 作成日時
  }
  pages: Array<{
    pageNumber: number          // ページ番号
    content: string             // ページ内容
    images?: Array<{            // 抽出された画像
      description: string       // 画像の説明
      position: string          // 位置
    }>
    tables?: Array<{            // 抽出されたテーブル
      headers: string[]         // ヘッダー行
      rows: string[][]          // データ行
    }>
  }>
}
```

## Why Not OCR?
1. **精度**: 視覚的解析はOCRより高精度
2. **構造理解**: ドキュメントの意味的構造を理解
3. **特許回避**: OCR技術の特許問題を回避
4. **コンテキスト**: 周囲の文脈を考慮した解析

## Usage Example
```typescript
import { runVisualParse } from "@/lib/agents/runner"

const result = await runVisualParse(pdfBuffer, { language: "ja" })
console.log(`ページ数: ${result.metadata.pageCount}`)
console.log(result.markdown)
```

## Environment Variables
- `LLAMA_CLOUD_API_KEY`: LlamaCloud APIキー

## Processing Pipeline Position
このスキルは処理パイプラインの**最初のステップ**として実行されます：

```
[PDF Upload] → [visual-parse] → [pii-masking] → [fast-check] → [deep-reason]
```

## Notes
- 大きなPDFファイル（50MB以上）は処理に時間がかかる場合があります
- 暗号化されたPDFは事前に復号化が必要
- 画像のみのPDF（スキャンドキュメント）にも対応
