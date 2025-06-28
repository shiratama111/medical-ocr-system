# Supabase認証設定の更新

メール認証後のリダイレクト問題を解決するため、Supabaseの認証設定を手動で更新する必要があります。

## 設定手順

1. **Supabaseダッシュボードにアクセス**
   - https://supabase.com/dashboard/project/rquqohsealjcvfxifwet

2. **Authentication設定を開く**
   - 左サイドバーから「Authentication」を選択
   - 「Settings」タブをクリック

3. **Site URL の更新**
   ```
   現在: http://localhost:3000
   変更後: https://medical-ocr-system-kwaqr6740-togynogy-gmailcoms-projects.vercel.app
   ```

4. **Redirect URLs の追加**
   「Additional redirect URLs」に以下を追加:
   ```
   https://medical-ocr-system-kwaqr6740-togynogy-gmailcoms-projects.vercel.app/**
   ```

5. **設定保存**
   - 「Save」ボタンをクリック

## 重要な注意点

- 本番環境のURLが変更された場合、この設定も合わせて更新する必要があります
- localhost:3000も開発用として残しておくことを推奨します
- カスタムドメインを設定する場合は、そのドメインも追加してください

## 確認方法

設定完了後：
1. 新規ユーザーで登録
2. 確認メールのリンクをクリック
3. 正しく本番サイトにリダイレクトされることを確認