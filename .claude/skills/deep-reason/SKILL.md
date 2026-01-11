# Deep Reason Skill

## Overview
Claude 3.5 Sonnet を使用した詳細な法的判定スキル。
文脈を理解し、法的観点から問題点を分析、修正案を生成します。

## Model
- Provider: Anthropic
- Model: claude-3-5-sonnet-latest
- Latency: ~3-5秒

## Input
```typescript
interface DeepReasonInput {
  text: string                    // 分析対象のテキスト
  fastCheckResult?: FastCheckResult  // fast-checkの事前結果（オプション）
}
```

## Output
```typescript
interface DeepReasonOutput {
  legalJudgment: {
    isCompliant: boolean           // 法的に問題ないか
    riskLevel: "none" | "low" | "medium" | "high" | "critical"
    issues: Array<{
      type: string                 // 法的問題のカテゴリ
      description: string          // 問題の詳細説明
      location: string             // 問題箇所の引用
      suggestedFix: string         // 修正案
    }>
  }
  modifications: Array<{
    original: string               // 元のテキスト
    modified: string               // 修正後のテキスト
    reason: string                 // 修正理由
  }>
  postalWorkerExplanation: string  // 郵便局員への説明（わかりやすい日本語）
  summary: string                  // 全体の要約
}
```

## Legal Categories
1. **個人情報保護法** - 個人情報の取り扱い
2. **名誉毀損・侮辱** - 人格権の侵害
3. **脅迫・恐喝** - 刑法上の問題
4. **景品表示法** - 不当表示
5. **特定商取引法** - 取引に関する規制
6. **著作権法** - 知的財産権

## Usage Example
```typescript
import { runDeepReason } from "@/lib/agents/runner"

const result = await runDeepReason(text, fastCheckResult)
console.log(`リスクレベル: ${result.legalJudgment.riskLevel}`)
console.log(`問題点: ${result.legalJudgment.issues.length}件`)
```

## Postal Worker Explanation
このフィールドは、郵便局員が顧客に説明できるよう、専門用語を避けたわかりやすい日本語で記述されます。

例:
```
このお手紙には、相手の方を傷つける可能性のある表現が含まれています。
具体的には「〇〇」という部分が、名誉毀損に該当する可能性があります。
「△△」という表現に変更されることをお勧めいたします。
```

## Environment Variables
- `ANTHROPIC_API_KEY`: Anthropic APIキー

## Notes
- fast-checkの結果を入力として受け取ることで、より精度の高い判定が可能
- 法的判断は参考情報であり、最終的な判断は法律の専門家に相談すべき
- 日本の法律に基づいて判定
