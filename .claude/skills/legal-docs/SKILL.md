# Legal Documents Generator SKILL

## Overview

利用規約（Terms of Service）とプライバシーポリシー（Privacy Policy）を、
日本の法律およびサービス要件に準拠した形で生成するスキル。

## 対象法令・ガイドライン

### 日本法
- **民法** - 契約の基本原則
- **消費者契約法** - 不当条項の規制
- **特定商取引法** - 通信販売の表示義務
- **電子消費者契約法** - 電子契約の成立要件
- **個人情報保護法** - 個人情報の取扱い
- **プロバイダ責任制限法** - 免責規定

### 国際基準
- **GDPR** (EU一般データ保護規則) - EU居住者向け
- **CCPA** (カリフォルニア消費者プライバシー法) - 米国向け

### 業界ガイドライン
- 総務省「オンラインサービスにおける消費者保護指針」
- 経済産業省「電子商取引等に関する準則」
- JIPDEC「プライバシーマーク」基準

## 生成ドキュメント

### 1. 利用規約 (Terms of Service)
- サービス概要・定義
- アカウント・利用条件
- 禁止事項
- 知的財産権
- 免責事項・責任制限
- 解約・退会
- 準拠法・管轄裁判所
- 規約変更

### 2. プライバシーポリシー (Privacy Policy)
- 事業者情報
- 収集する個人情報の種類
- 収集方法
- 利用目的
- 第三者提供
- 外部サービス連携
- Cookie・トラッキング
- データ保持期間
- セキュリティ対策
- ユーザーの権利
- 問い合わせ先

### 3. 特定商取引法に基づく表記 (Optional)
- 販売業者名
- 所在地
- 連絡先
- 販売価格
- 支払方法
- 返品・解約

## Input

```typescript
interface LegalDocsInput {
  // 事業者情報
  company: {
    name: string           // 会社名
    nameEn?: string        // 英語名
    representative: string // 代表者名
    address: string        // 所在地
    email: string          // 連絡先メール
    phone?: string         // 電話番号
    registrationNumber?: string // 法人番号
  }

  // サービス情報
  service: {
    name: string           // サービス名
    url: string            // サービスURL
    description: string    // サービス概要
    launchDate: string     // サービス開始日
  }

  // 機能情報
  features: {
    hasUserAccounts: boolean      // ユーザーアカウント機能
    hasPayment: boolean           // 決済機能
    hasFileUpload: boolean        // ファイルアップロード
    hasAIProcessing: boolean      // AI処理
    hasThirdPartyIntegration: boolean // 外部サービス連携
    collectsPersonalInfo: boolean // 個人情報収集
    usesAnalytics: boolean        // アナリティクス使用
    usesCookies: boolean          // Cookie使用
  }

  // 決済情報（hasPayment=true時）
  payment?: {
    provider: string       // 決済プロバイダ（Stripe等）
    subscriptionBased: boolean // サブスク型か
    refundPolicy: string   // 返金ポリシー
  }

  // 外部サービス
  thirdPartyServices?: Array<{
    name: string           // サービス名
    purpose: string        // 利用目的
    dataShared: string[]   // 共有データ
    privacyPolicyUrl: string // 相手方のポリシーURL
  }>

  // ターゲット地域
  targetRegions: ('japan' | 'global' | 'eu' | 'us')[]

  // 出力形式
  outputFormat: 'markdown' | 'html' | 'pdf'
  language: 'ja' | 'en' | 'both'
}
```

## Output

```typescript
interface LegalDocsOutput {
  termsOfService: {
    markdown: string
    version: string
    effectiveDate: string
    sections: string[]
  }
  privacyPolicy: {
    markdown: string
    version: string
    effectiveDate: string
    sections: string[]
  }
  tokushoho?: {
    markdown: string
  }
  metadata: {
    generatedAt: string
    complianceChecklist: string[]
    warnings: string[]
  }
}
```

## Usage

```bash
python legal_docs.py '<input_json>'
```

## 法的注意事項

1. **本SKILLは法的助言を構成しません**
2. 生成されたドキュメントは必ず弁護士によるレビューを受けてください
3. 定期的に法改正をチェックし、ドキュメントを更新してください
4. 業界固有の規制がある場合は追加条項が必要です

## 更新履歴

- 2024-01-15: 初版作成
- 個人情報保護法2022年改正対応
- GDPR/CCPA条項追加
