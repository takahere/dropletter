# PDF Highlight

## Overview
PDFファイル内のNGワード、PII、法的問題箇所のページ番号と座標を計算し、
ハイライトデータを生成するスキル。

## Technology
- **Library**: PyMuPDF (fitz) - 高速で信頼性の高いPDF処理
- **Language**: Python 3.11+

## Key Features
- PDF内テキスト検索と座標取得
- 日本語テキストの正規化処理
- 複数ページ対応
- ハイライト座標のJSON出力

## Input
```typescript
interface PdfHighlightInput {
  filePath: string          // PDFファイルパス
  searchItems: Array<{
    id: string              // 一意のID
    type: "ng_word" | "pii" | "legal_issue"
    text: string            // 検索するテキスト
    severity: string        // 重要度
    reason?: string         // 理由（表示用）
    suggestedFix?: string   // 修正案
  }>
}
```

## Output
```typescript
interface PdfHighlightOutput {
  highlights: Array<{
    id: string
    type: string
    text: string
    severity: string
    reason?: string
    suggestedFix?: string
    positions: Array<{
      pageNumber: number    // 1-indexed
      x0: number           // 左端 (0-1 normalized)
      y0: number           // 上端 (0-1 normalized)
      x1: number           // 右端 (0-1 normalized)
      y1: number           // 下端 (0-1 normalized)
    }>
  }>
  notFound: string[]       // 見つからなかったテキスト
  pageCount: number
}
```

## Environment Variables
なし（PyMuPDFはオフラインで動作）

## Processing Pipeline Position
fast-check の後、deep-reason の前に実行

```
[visual-parse] → [pii-masking] → [fast-check] → [pdf-highlight] → [deep-reason]
                                      ↓               ↓
                              NGワード検出      PDF座標計算＆保存
```

## Usage Example
```bash
python .claude/skills/pdf-highlight/scripts/pdf_highlight.py /path/to/file.pdf '[{"id":"1","type":"ng_word","text":"検索語","severity":"high"}]'
```

## Notes
- 座標は0-1の正規化された値で返される（ページサイズに依存しない）
- 検索に失敗したテキストは `notFound` 配列に格納される
- 日本語テキストはUnicode正規化（NFKC）して検索
