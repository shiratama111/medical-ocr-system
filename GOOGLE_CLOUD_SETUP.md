# Google Cloud Document AI 設定手順

## 完了事項
✅ サービスアカウントキーファイルの配置  
✅ 環境変数の設定（ローカル・本番）  
✅ プロジェクト設定の配置  

## 次に必要な作業

### 1. Google Cloud Console でプロセッサーを作成

1. **Google Cloud Console にアクセス**
   - https://console.cloud.google.com/

2. **プロジェクトを選択**
   - `hybrid-sunbeam-464101-c2` プロジェクトを選択

3. **Document AI API を有効化**
   - APIs & Services → Library
   - "Document AI API" を検索し、有効化

4. **プロセッサーを作成**
   - Document AI → プロセッサー
   - "プロセッサーを作成" をクリック
   - プロセッサータイプ: **"Healthcare Document OCR"** または **"Form Parser"**
   - リージョン: **us (Global)**
   - 名前: `medical-document-processor`

5. **プロセッサーIDを取得**
   - 作成されたプロセッサーの詳細ページでプロセッサーIDを確認
   - 現在設定されているID `9b7f8a2d8c4e5f6a` を実際のIDに変更

### 2. 環境変数の更新

実際のプロセッサーIDを取得後、以下を更新してください：

#### ローカル環境 (.env.local)
```bash
GOOGLE_CLOUD_PROCESSOR_ID=実際のプロセッサーID
```

#### 本番環境 (Vercel)
```bash
vercel env rm GOOGLE_CLOUD_PROCESSOR_ID production
echo "実際のプロセッサーID" | vercel env add GOOGLE_CLOUD_PROCESSOR_ID production
```

### 3. Supabase ストレージバケット作成

1. **Supabase ダッシュボードにアクセス**
   - https://supabase.com/dashboard/project/rquqohsealjcvfxifwet

2. **Storage → New bucket**
   - バケット名: `documents`
   - Public: **OFF** (プライベート)
   - File size limit: `20MB`

### 4. 動作確認

プロセッサー作成後：
1. PDFファイルをアップロード
2. "処理開始" をクリック
3. AI-OCRが実行され、実際のテキスト抽出が行われる

## 注意事項

- プロセッサーIDは `projects/{project-id}/locations/{location}/processors/{processor-id}` の形式
- Healthcare Document OCRは医療文書に特化した高精度OCR
- API使用料金が発生する可能性があります（無料枠あり）

## トラブルシューティング

### エラー: "Invalid processor ID"
→ プロセッサーIDが正しく設定されているか確認

### エラー: "Authentication failed"
→ サービスアカウントキーが正しく配置されているか確認

### エラー: "API not enabled"
→ Document AI APIが有効化されているか確認