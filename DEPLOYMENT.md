# デプロイメントガイド

## Vercelへのデプロイ手順

### 1. 前提条件

- GitHubアカウント
- Vercelアカウント
- Supabaseプロジェクトの作成済み
- Google Cloud Document AI APIの設定済み（オプション）

### 2. GitHubへのプッシュ

```bash
# GitHubでリポジトリを作成後
git remote add origin https://github.com/YOUR_USERNAME/medical-ocr-system.git
git branch -M main
git push -u origin main
```

### 3. Vercelでのセットアップ

1. [Vercel](https://vercel.com)にログイン
2. "New Project"をクリック
3. GitHubリポジトリをインポート
4. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabaseプロジェクトの URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabaseの anon key
   - `GOOGLE_APPLICATION_CREDENTIALS`: Google Cloud サービスアカウントのパス（将来実装用）
   - `GOOGLE_CLOUD_PROJECT_ID`: Google CloudプロジェクトID（将来実装用）
   - `GOOGLE_CLOUD_LOCATION`: `us`（将来実装用）
   - `GOOGLE_CLOUD_PROCESSOR_ID`: Document AIプロセッサーID（将来実装用）

5. "Deploy"をクリック

### 4. Supabaseのセットアップ

1. Supabaseダッシュボードにログイン
2. SQLエディタを開く
3. `supabase/migrations/001_initial_schema.sql`の内容を実行
4. Storageで`documents`バケットを作成（Public: OFF）
5. AuthenticationでユーザーのSignup設定を確認

### 5. デプロイ後の確認

1. デプロイされたURLにアクセス
2. `/login`ページが表示されることを確認
3. Supabaseでユーザーを作成してログインテスト

### 6. 今後の実装予定

- Google Cloud Document AI連携
- PDFビューワーと編集画面
- データエクスポート機能
- エラーハンドリングの強化

### 注意事項

- `.env.local`ファイルはGitにコミットされません
- 本番環境の環境変数は必ずVercelのダッシュボードから設定してください
- Supabaseの無料プランでは制限があるため、本番利用時は有料プランを検討してください