# EmojiLab.
<img width="1491" height="1055" alt="image" src="https://github.com/user-attachments/assets/5f4eb0d2-1c9c-42dd-9573-17670c5fbd24" />


<img width="2000" height="1103" alt="image" src="https://github.com/user-attachments/assets/5b502bd7-a3e2-4870-8128-8203f3376b96" />

<img width="710" height="1414" alt="image" src="https://github.com/user-attachments/assets/8636b4e8-16c5-4ebb-9a4b-73c9644e177e" />

修士研究向けの「テキストベース絵文字デザイン支援システム」です。  
チャットアプリで使われるカスタム絵文字を対象に、文字レイアウト・縁取り・配色を調整しながら、視認性と縮小耐性をその場で評価できます。

## 概要

このシステムは、以下の2指標を統合して絵文字デザインを支援します。

- 数理評価: APCA-W3 参照実装によるコントラスト評価と縮小耐性を即時計算
- 縮小耐性評価: 文字数、Unicode画数、線幅、ウェイト、横幅変形、字間・行間、配置リスクを減点

主な用途は次の通りです。

- チャット向けの文字絵文字デザイン制作
- 視認性の高い文字装飾の比較実験
- 研究発表・論文用のプロトタイプ検証

## 主な機能

- ライト / ダーク両背景でのプレビュー
- PNG書き出し
- テキスト、フォント、サイズ、縁取り、色の編集
- スタイル履歴の保存・復元
- モバイルUIに最適化した編集パネル
- ルールベースの改善コメント

## 技術構成

- Vite
- React 19
- TypeScript
- Tailwind CSS CDN
- `apca-w3`

## フォントライセンス

- 標準書体には [LINE Seed JP](https://seed.line.me/index_jp.html) を使用しています
- LINE Seed JP は LY Corporation が SIL Open Font License 1.1 で公開しており、個人・商用を問わず利用できます。フォントファイルそのものを第三者が単体販売することはできません
- 本システムでは Google Fonts 経由で配信し、標準の4ウェイト（Thin / Regular / Bold / ExtraBold）を利用します

## 評価ロジック

### 1. APCAコントラスト

文字色と縁取り色の関係から知覚コントラストを計算します。  
縁取りが十分に機能している場合、実際のチャットUIで埋もれにくい設計になっているかを確認できます。

実装には `apca-w3` を用いており、表示値は APCA の signed Lc をもとにした絶対値で扱っています。研究用途では、どの色組合せを評価対象にしたかとあわせて解釈してください。

### 2. 縮小耐性

以下の要素をもとに幾何学的なスコアを算出します。

- 文字数の多さ
- フォントの太さ
- 内側縁取りの太すぎ問題
- 有効化した外側縁取りの線幅
- 既知漢字の画数と高画数文字数
- 字間、行間、横幅変形、上下行の幅、縦横比

### 3. デザインスコア

APCAコントラスト適合と縮小耐性を50%ずつのリスク減点として統合します。赤い個別指標がある場合は総合点も69以下、黄色い個別指標がある場合は79以下に制限し、表示色の逆転を防ぎます。詳細仕様は [Scoring Rule](docs/research/scoring-rule-version.md) を参照してください。

## セットアップ

### 推奨環境

- Node.js 20 以上
- npm 9 以上

注記: Node.js 18 でもビルドは通る場合がありますが、依存ライブラリ側は Node 20 以上を推奨しています。

### インストール

```bash
npm install
```

### 開発サーバー

```bash
npm run dev
```

### 型チェック

```bash
npm run lint
```

### 本番ビルド

```bash
npm run build
```

## GitHub Pages 公開

このリポジトリには GitHub Pages 向けの自動デプロイ workflow を含めています。  
`main` へ push すると、GitHub Actions が `dist` をビルドして Pages に公開します。

想定公開URL:

- [https://210on.github.io/custom-emoji-studio/](https://210on.github.io/custom-emoji-studio/)

初回のみ GitHub 側で次を設定してください。

1. `Settings`
2. `Pages`
3. `Build and deployment` の `Source` を `GitHub Actions` に変更

公開環境でも API キーは不要です。評価はクライアント内のルールベース診断として動作します。

## ディレクトリ構成

```text
.
├── App.tsx
├── components
│   ├── ChatPreview.tsx
│   ├── DesignDiagnosis.tsx
│   ├── Header.tsx
│   ├── PreviewSection.tsx
│   └── Toolbar.tsx
├── services
│   └── designFeedbackService.ts
├── utils
│   ├── emojiCanvas.ts
│   └── kanjiStrokeCounts.ts
├── locales.ts
├── types.ts
└── index.html
```

## 研究用途での注意点

- デザインスコアは補助評価であり、最終評価はユーザテストや主観評価と併用してください
- 履歴はブラウザの `localStorage` に保存されます

## 研究仕様書

論文・審査資料向けに、現行実装のロジックと学術的位置づけを整理した仕様書を用意しています。

- [docs/research/system-specification.md](/Users/shonebato/Documents/New%20project/custom-emoji-studio/docs/research/system-specification.md)
- [docs/research/design-guidelines.md](/Users/shonebato/Documents/New%20project/custom-emoji-studio/docs/research/design-guidelines.md)
- [docs/research/default-color-palette-rationale.md](docs/research/default-color-palette-rationale.md)
- [docs/research/data/README.md](docs/research/data/README.md)

## 今回の整備内容

- モバイル時の画面構成を再設計
- 描画ロジックを共通化してプレビューと書き出しの差異を削減
- ルールベースの総合支援スコアと改善コメントを追加
- 欠けていた `index.css` を追加
- スタイル履歴復元時の状態汚染を防止

## 今後の拡張案

- 被験者実験向けログ保存
- 複数案比較モード
- 画数辞書の拡張
- 複数背景条件での自動比較

## ライセンス / 研究メモ

このリポジトリが論文執筆に進む場合は、READMEとは別に以下を用意すると整理しやすいです。

- 実験目的
- 評価指標の定義
- 被験者条件
- 使用フォント条件
- 制作タスク手順
- 倫理的配慮とデータ管理方針
