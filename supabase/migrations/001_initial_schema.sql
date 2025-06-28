-- documentsテーブル作成
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'review', 'confirmed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- extracted_dataテーブル作成
CREATE TABLE IF NOT EXISTS extracted_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  patient_name TEXT,
  hospital_name TEXT,
  visit_dates TEXT[],
  visit_days_count INTEGER,
  inpatient_period JSONB,
  total_cost NUMERIC,
  cost_breakdown JSONB,
  diagnoses JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_extracted_data_document_id ON extracted_data(document_id);

-- RLS（Row Level Security）を有効化
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_data ENABLE ROW LEVEL SECURITY;

-- documentsテーブルのRLSポリシー
CREATE POLICY "Users can view their own documents" ON documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents" ON documents
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents" ON documents
  FOR DELETE USING (auth.uid() = user_id);

-- extracted_dataテーブルのRLSポリシー
CREATE POLICY "Users can view extracted data for their documents" ON extracted_data
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extracted_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert extracted data for their documents" ON extracted_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extracted_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update extracted data for their documents" ON extracted_data
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extracted_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete extracted data for their documents" ON extracted_data
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM documents
      WHERE documents.id = extracted_data.document_id
      AND documents.user_id = auth.uid()
    )
  );

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_extracted_data_updated_at BEFORE UPDATE ON extracted_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ストレージバケット作成（Supabase管理画面で実行）
-- INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);