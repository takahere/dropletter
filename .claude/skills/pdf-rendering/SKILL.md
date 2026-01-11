# PDF Rendering Skill

## 概要
dropletterプロジェクトでPDFを正しく表示するための設定とトラブルシューティング。

## 使用ライブラリ

### react-pdf-highlighter
- **バージョン**: 8.0.0-rc.0
- **内部依存**: pdfjs-dist@4.4.168
- **用途**: PDFビューア + ハイライト機能

## 必須設定

### 1. PDF.js設定

```typescript
// PDF.jsのバージョンはreact-pdf-highlighterの内部バージョンと一致させる
const PDFJS_VERSION = "4.4.168"

// Worker: 別スレッドでPDFをパース
const WORKER_SRC = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`

// cMap: 文字マップ（日本語フォント等の表示に必須）
const CMAP_URL = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`
```

### 2. PdfLoaderの設定

```tsx
<PdfLoader
  url={pdfUrl}
  workerSrc={WORKER_SRC}
  cMapUrl={CMAP_URL}      // ← 日本語テキスト表示に必須
  cMapPacked={true}        // ← 圧縮されたcMapを使用
  beforeLoad={<LoadingComponent />}
  onError={(error) => console.error(error)}
>
  {(pdfDocument) => (
    <PdfHighlighter ... />
  )}
</PdfLoader>
```

### 3. CSS設定

`globals.css` に以下を追加:

```css
/* react-pdf-highlighter スタイル */
@import "react-pdf-highlighter/dist/style.css";

/* PDFビューアのコンテナ */
.PdfHighlighter {
  position: relative;
  height: 100%;
  min-height: 600px;
}
```

## トラブルシューティング

### 問題1: テキストが消える / 表示されない

**原因**: cMapが設定されていない

**解決策**:
```tsx
<PdfLoader
  cMapUrl={`https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/cmaps/`}
  cMapPacked={true}
  ...
/>
```

**原因**: Workerが読み込めていない

**解決策**:
- ブラウザのNetworkタブでworker.min.mjsが読み込まれているか確認
- CORSエラーがある場合はunpkgから直接読み込む

### 問題2: ChunkLoadError

**原因**: Next.jsのWebpack設定問題

**解決策**: `next.config.js` に追加:
```javascript
transpilePackages: ['react-pdf-highlighter'],
webpack: (config, { isServer }) => {
  config.resolve.alias.canvas = false
  if (!isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    }
  }
  return config
}
```

### 問題3: ESMモジュールエラー

**原因**: pdfjs-distのESMとNext.jsの互換性問題

**解決策**: `next.config.js` に追加:
```javascript
webpack: (config) => {
  config.resolve.extensionAlias = {
    '.js': ['.js', '.ts', '.tsx'],
    '.mjs': ['.mjs'],
  }
  return config
}
```

### 問題4: 日本語が文字化け

**原因**: cMapが正しく読み込まれていない

**解決策**:
1. `cMapUrl`が正しいパスか確認
2. `cMapPacked={true}`を設定
3. ブラウザのNetworkタブでcmapファイル（例: `UniJIS-UTF16-H.bcmap`）がロードされているか確認

## PDFスケール設定

### pdfScaleValue オプション

PdfHighlighterの`pdfScaleValue`プロパティでPDFのサイズを制御できる:

```tsx
<PdfHighlighter
  pdfDocument={pdfDocument}
  pdfScaleValue="page-fit"  // ページ全体を表示
  // ...
/>
```

**利用可能な値**:
- `"page-fit"`: ページ全体がコンテナ内に収まる
- `"page-width"`: ページ幅をコンテナ幅に合わせる
- `"auto"`: 自動（デフォルト）
- `"0.5"`, `"1"`, `"1.5"` など: 数値で直接スケールを指定

### コンテナ高さの設定

PDFビューアーのコンテナには固定高さを設定する:

```tsx
<div className="relative w-full h-[700px] bg-slate-100 rounded-2xl overflow-hidden">
  <PdfLoader ...>
    {(pdfDocument) => (
      <PdfHighlighter pdfScaleValue="page-fit" ... />
    )}
  </PdfLoader>
</div>
```

**推奨設定**:
- `h-[700px]`: 大きめの表示サイズ（PDFを見やすく）
- `overflow-hidden`: はみ出し部分を隠す
- 内部スクロールはPdfHighlighterが自動で処理

---

## PDFハイライト実装

### ハイライトの種類

| タイプ | 色 | CSS クラス |
|--------|-----|-----------|
| NGワード | 赤 | `highlight-ng-word` |
| PII（個人情報） | 青 | `highlight-pii` |
| 法的問題 | オレンジ | `highlight-legal-issue` |

### CSSスタイル

```css
/* NGワードハイライト */
.highlight-ng-word .Highlight__part {
  background-color: rgba(239, 68, 68, 0.35) !important;
}

/* PIIハイライト */
.highlight-pii .Highlight__part {
  background-color: rgba(59, 130, 246, 0.35) !important;
}

/* 法的問題ハイライト */
.highlight-legal-issue .Highlight__part {
  background-color: rgba(245, 158, 11, 0.35) !important;
}
```

## バージョン互換性

| ライブラリ | バージョン | 備考 |
|-----------|----------|------|
| react-pdf-highlighter | 8.0.0-rc.0 | pdfjs-dist@4.x同梱 |
| pdfjs-dist | 4.4.168 | react-pdf-highlighterと同じバージョンを使用 |
| react-pdf | 使用しない | pdfjs-dist@3.xを使用するため競合 |

**重要**: react-pdfとreact-pdf-highlighterは異なるpdfjs-distバージョンを使用するため、同時使用は避ける。

## チェックリスト

PDFが正しく表示されない場合:

- [ ] `workerSrc`が正しいバージョンを指しているか
- [ ] `cMapUrl`が設定されているか
- [ ] `cMapPacked={true}`が設定されているか
- [ ] `next.config.js`の`transpilePackages`に`react-pdf-highlighter`が含まれているか
- [ ] ブラウザのコンソールにエラーがないか
- [ ] Networkタブでworkerとcmapがロードされているか

## 参考リンク

- [react-pdf-highlighter GitHub](https://github.com/agentcooper/react-pdf-highlighter)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [pdfjs-dist npm](https://www.npmjs.com/package/pdfjs-dist)
