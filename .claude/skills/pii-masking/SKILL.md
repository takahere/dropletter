# PII Masking Skill

## Overview
Microsoft Presidio を使用した個人情報（PII）検出・匿名化スキル。
テキスト内の個人名、住所、電話番号などを検出し、プレースホルダーに置換します。

## Technology
- Library: Microsoft Presidio
- Analyzer: presidio-analyzer
- Anonymizer: presidio-anonymizer
- NLP Backend: spaCy (ja_core_news_lg)

## Supported PII Types
| タイプ | プレースホルダー | 例 |
|--------|------------------|-----|
| PERSON | `<PERSON>` | 田中太郎 → `<PERSON>` |
| ADDRESS | `<ADDRESS>` | 東京都渋谷区... → `<ADDRESS>` |
| PHONE_NUMBER | `<PHONE>` | 090-1234-5678 → `<PHONE>` |
| EMAIL | `<EMAIL>` | test@example.com → `<EMAIL>` |
| CREDIT_CARD | `<CREDIT_CARD>` | 4111-1111-1111-1111 → `<CREDIT_CARD>` |
| DATE_TIME | `<DATE>` | 2024年1月1日 → `<DATE>` |
| ORGANIZATION | `<ORG>` | 株式会社〇〇 → `<ORG>` |

## Input
```typescript
interface PIIMaskingInput {
  text: string                    // マスキング対象のテキスト
  options?: {
    entities?: string[]           // 検出対象のエンティティタイプ
    language?: string             // 言語 (default: "ja")
    scoreThreshold?: number       // 検出スコアの閾値 (default: 0.7)
  }
}
```

## Output
```typescript
interface PIIMaskingOutput {
  maskedText: string              // マスキング済みテキスト
  detectedEntities: Array<{
    type: string                  // エンティティタイプ
    text: string                  // 元のテキスト（参照用）
    start: number                 // 開始位置
    end: number                   // 終了位置
    score: number                 // 検出スコア
  }>
  statistics: {
    totalDetected: number         // 検出された総数
    byType: Record<string, number> // タイプ別の検出数
  }
}
```

## Usage Example
```typescript
import { runPIIMasking } from "@/lib/agents/runner"

const result = await runPIIMasking(text, { scoreThreshold: 0.8 })
console.log(`検出されたPII: ${result.statistics.totalDetected}件`)
console.log(result.maskedText)
```

## Processing Pipeline Position
このスキルは処理パイプラインの**2番目のステップ**として実行されます：

```
[PDF Upload] → [visual-parse] → [pii-masking] → [fast-check] → [deep-reason]
```

## Environment Variables
なし（ローカルで実行）

## Installation
```bash
pip install presidio-analyzer presidio-anonymizer spacy
python -m spacy download ja_core_news_lg
```

## Notes
- 日本語固有の個人情報パターン（マイナンバー等）にも対応
- 元のテキストは`detectedEntities`で参照可能（ログには保存しない）
- 文脈を考慮した検出（同姓同名の区別など）
- 誤検知を減らすためスコア閾値を調整可能
