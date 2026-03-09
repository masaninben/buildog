# Penstok

Next.js 14 + Supabase + TailwindCSS で構築した Web アプリケーション。

## 技術スタック

- **Next.js 14** (App Router)
- **Supabase** (認証・DB)
- **TailwindCSS**
- **TypeScript**

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example` を `.env.local` にコピーして値を設定する。

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Supabase の設定

1. [Supabase](https://supabase.com) でプロジェクトを作成する
2. Authentication > Providers で **Google** を有効化する
3. Google Cloud Console で OAuth 2.0 クライアントを作成し、以下を設定する
   - 承認済みリダイレクト URI: `https://<your-project>.supabase.co/auth/v1/callback`
4. Supabase の Authentication > URL Configuration で以下を設定する
   - Site URL: `http://localhost:3000`（開発環境）
   - Redirect URLs: `http://localhost:3000/auth/callback`

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセスできる。

## ディレクトリ構成

```
src/
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts      # OAuth コールバック処理
│   ├── login/
│   │   ├── page.tsx          # ログインページ
│   │   └── LoginForm.tsx     # Google ログインボタン
│   ├── layout.tsx
│   └── page.tsx              # ホームページ（要認証）
├── components/
│   └── LogoutButton.tsx      # ログアウトボタン
├── lib/
│   └── supabase/
│       ├── client.ts         # ブラウザ用 Supabase クライアント
│       ├── server.ts         # サーバー用 Supabase クライアント
│       └── middleware.ts     # セッション更新処理
└── middleware.ts              # ルート保護ミドルウェア
```
