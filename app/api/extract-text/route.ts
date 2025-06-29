import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiAIService } from '@/lib/google-cloud/gemini-ai'

export async function POST(request: NextRequest) {
  try {
    console.log('=== TEXT EXTRACTION API START ===')
    
    // 1. リクエスト解析
    const body = await request.json()
    const { documentId } = body
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // 2. Supabase接続と認証
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // 3. ドキュメント取得
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      console.error('Document fetch error:', docError)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 4. PDFファイルのダウンロード
    console.log('Downloading PDF from storage...')
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('documents')
      .download(document.file_url)
      
    if (downloadError) {
      console.error('PDF download error:', downloadError)
      return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 })
    }
    
    if (!fileData) {
      return NextResponse.json({ error: 'No file data received' }, { status: 500 })
    }
    
    console.log('PDF downloaded successfully, size:', fileData.size)
    
    // 5. PDFをBufferに変換
    const arrayBuffer = await fileData.arrayBuffer()
    const pdfBuffer = Buffer.from(arrayBuffer)
    
    // 6. Gemini AIでテキスト抽出
    console.log('Extracting text with Gemini AI...')
    const geminiService = getGeminiAIService()
    const extractedText = await geminiService.extractText(pdfBuffer)
    
    console.log('Text extraction completed, length:', extractedText.length)
    
    // 7. extracted_dataテーブルに保存（オプション）
    const { error: saveError } = await supabase
      .from('extracted_data')
      .upsert({
        document_id: documentId,
        raw_text: extractedText,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'document_id'
      })
    
    if (saveError) {
      console.error('Failed to save extracted text:', saveError)
      // エラーがあってもテキストは返す
    }
    
    return NextResponse.json({ 
      success: true, 
      text: extractedText,
      fileName: document.file_name 
    })
    
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: `Text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}