# 診断書・レセプト データ化システム

Gemini AI を活用した医療文書のデータ化システム

## セットアップ手順

### 1. 環境設定

`.env.local` ファイルに以下の環境変数を設定してください：

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Gemini API
GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Supabaseのセットアップ

1. [Supabase](https://supabase.com)でプロジェクトを作成
2. プロジェクトのURL、anon key、service role keyを`.env.local`に設定
3. SQLエディタで `supabase/migrations/001_initial_schema.sql` を実行
4. Storageでバケットを作成:
   - バケット名: `documents`
   - Public: OFF

### 3. Gemini APIのセットアップ

1. [Google AI Studio](https://makersuite.google.com/app/apikey)でAPIキーを取得
2. `.env.local`の`GEMINI_API_KEY`に設定

### 4. 依存関係のインストール

```bash
npm install
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

## 機能概要

- **PDFアップロード**: ドラッグ&ドロップまたはファイル選択でPDFをアップロード
- **AI-OCR処理**: Gemini-2.5-pro APIを使用してPDFから医療情報を自動抽出
- **データ確認・修正**: 抽出されたデータをPDFと並べて確認・修正
- **データエクスポート**: CSV/JSON形式でのデータダウンロード

## 抽出可能な項目

- 患者名
- 医療機関名
- 通院日（リスト）
- 実通院日数
- 入院期間・日数
- 治療費総額
- 請求先別治療費
- 傷病名（主傷病名・副傷病名）
