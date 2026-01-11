# Fast Check Skill

## Overview
Llama 3 (Groq) を使用した高速NGワード検出スキル。
約0.5秒でテキスト内の問題のある表現を抽出します。

## Model
- Provider: Groq Cloud
- Model: llama-3.3-70b-versatile
- Latency: ~500ms

## Input
```typescript
interface FastCheckInput {
  text: string  // 検査対象のテキスト
}
```

## Output
```typescript
interface FastCheckOutput {
  ngWords: Array<{
    word: string       // 問題のある単語/フレーズ
    position: number   // テキスト内の位置
    severity: "high" | "medium" | "low"  // 重要度
    reason: string     // 問題の理由
  }>
  processingTimeMs: number  // 処理時間（ミリ秒）
}
```

## Detection Categories
1. **差別的表現** - 人種、性別、障害等に関する差別的な言葉
2. **名誉毀損** - 特定の個人や団体を誹謗中傷する表現
3. **プライバシー侵害** - 個人情報の不適切な露出
4. **脅迫・恐喝** - 脅迫や恐喝を示唆する表現
5. **不適切なコンテンツ** - 公序良俗に反する内容

## Usage Example
```typescript
import { runFastCheck } from "@/lib/agents/runner"

const result = await runFastCheck("検査対象のテキスト...")
console.log(`検出されたNGワード: ${result.ngWords.length}件`)
console.log(`処理時間: ${result.processingTimeMs}ms`)
```

## Environment Variables
- `GROQ_API_KEY`: Groq Cloud APIキー

## Notes
- このスキルは「前処理」として使用し、詳細な判定はdeep-reasonスキルで行う
- 誤検知を減らすため、低い確信度の結果も出力する
- 処理速度を優先するため、コンテキスト理解は限定的
