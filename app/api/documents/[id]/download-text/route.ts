import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ドキュメントの取得と権限チェック
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 抽出データの取得
    const { data: extractedData, error: extractError } = await supabase
      .from('extracted_data')
      .select('*')
      .eq('document_id', id)
      .single()

    if (extractError || !extractedData) {
      return NextResponse.json({ error: 'OCR data not found' }, { status: 404 })
    }

    // データをテキスト形式に変換
    const textContent = `医療データ抽出結果\n\n患者名: ${extractedData.patient_name || 'N/A'}\n病院名: ${extractedData.hospital_name || 'N/A'}\n通院日数: ${extractedData.visit_days_count || 0}\n総費用: ¥${extractedData.total_cost?.toLocaleString() || 0}`

    // テキストファイルとしてダウンロード
    const fileName = `${document.file_name.replace(/\.[^.]+$/, '')}_data.txt`
    
    return new NextResponse(textContent, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })
  } catch (error) {
    console.error('Error downloading OCR text:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}