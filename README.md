# Buildog（ビルドッグ）

**工事の安心を、写真で残す。**

リフォーム・建築工事の施工写真を案件ごとに整理し、施主にURL一本で共有するPWA。

施工管理ツールではなく「現場の安心を施主に見せるための共有ツール」として設計しています。施主はログイン不要でURLを開くだけで閲覧できます。

## 主な機能

- **案件管理**: 案件ごとに施工写真を整理・登録
- **写真一括アップロード**: 最大10枚・自動圧縮
- **タグ付け**: ビフォー / 施工中 / 材料 / アフター の4分類
- **公開・非公開切替**: 写真ごとにトグルで管理
- **写真並び替え**: ドラッグ＆ドロップ・長押しタッチ対応
- **代表画像設定**: 案件カードのサムネイルを指定
- **施主向け公開ページ**: ログイン不要・URLで閲覧
- **QRコード共有**: その場でQRを表示・コピー
- **QRコード付きPDF生成**: チラシとして配布可能
- **ダーク / ライトテーマ切替**

## 技術スタック

| 領域 | 技術 |
|---|---|
| フレームワーク | Vue 3 (Composition API) + TypeScript 5.4 |
| ビルド | Vite 5.3 |
| バックエンド | Firebase (Authentication / Firestore / Storage / Hosting) |
| PDF生成 | jsPDF |
| QRコード | qrcode |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local` を作成して以下を設定する。

```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 3. Firebase の設定

1. [Firebase Console](https://console.firebase.google.com) でプロジェクトを作成
2. Authentication で **Google** ログインを有効化
3. Firestore Database を作成しセキュリティルールを設定
4. Firebase CLI でプロジェクトをリンク

```bash
firebase login
firebase use <project-id>
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

### 5. デプロイ

```bash
npm run build
firebase deploy --only hosting
```

## ディレクトリ構成

```
src/
├── assets/
│   └── characters/       # マスコットキャラクター画像
├── components/
│   ├── AccountModal.vue  # アカウント情報モーダル
│   ├── GlobalToolbar.vue # グローバルナビゲーション
│   ├── PhotoUpload.vue   # 写真アップロード・圧縮
│   └── ProjectCard.vue   # 案件カード
├── composables/
│   └── useTheme.ts       # テーマ管理
├── lib/
│   ├── firebase.ts       # Firebase 初期化
│   └── auth.ts           # 認証ユーティリティ
├── router/               # Vue Router 設定
├── store/
│   ├── projects.ts       # 案件・写真データ管理
│   └── userProfile.ts    # ユーザープロフィール
├── types/
│   └── index.ts          # 型定義
├── views/
│   ├── LoginView.vue         # ログイン
│   ├── ProjectListView.vue   # 案件一覧
│   ├── ProjectCreateView.vue # 案件作成
│   ├── ProjectDetailView.vue # 案件詳細・写真管理
│   └── PublicProjectView.vue # 施主向け公開ページ
└── App.vue               # ルートコンポーネント・テーマ管理
```

## ライセンス

Private
