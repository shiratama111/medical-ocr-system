# 診断書・レセプト データ化システム

AI-OCRを活用した医療文書のデータ化システム

## セットアップ手順

### 1. 環境設定

`.env.local` ファイルに以下の環境変数を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Cloud Document AI
GOOGLE_APPLICATION_CREDENTIALS=path_to_your_service_account_json
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_LOCATION=us
GOOGLE_CLOUD_PROCESSOR_ID=your_processor_id
```

### 2. Supabaseのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. プロジェクトのURL とanon keyを`.env.local`に設定
3. SQLエディタで `supabase/migrations/001_initial_schema.sql` を実行
4. Storageでバケットを作成:
   - バケット名: `documents`
   - Public: OFF

### 3. Google Cloud Document AIのセットアップ

1. Google Cloud Consoleでプロジェクトを作成
2. Document AI APIを有効化
3. Healthcare Document OCRプロセッサーを作成
4. サービスアカウントを作成し、JSONキーをダウンロード
5. 環境変数に設定

### 4. 依存関係のインストール

```bash
npm install
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

## 次の実装ステップ

1. Google Cloud Document AI連携のAPIルート作成
2. PDFビューワーと編集画面の実装
3. データエクスポート機能の実装
4. エラーハンドリングの強化
