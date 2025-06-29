import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // テーブル情報を取得
    const { data: tablesInfo, error: infoError } = await supabase
      .rpc('get_table_info', {})

    // 実際のデータサンプルを取得
    const { data: documentsData, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)

    const { data: extractedData, error: extractedError } = await supabase
      .from('extracted_data')
      .select('*')
      .limit(1)

    return NextResponse.json({
      tables_info: {
        data: tablesInfo,
        error: infoError
      },
      documents_sample: {
        data: documentsData,
        error: docsError,
        columns: documentsData && documentsData.length > 0 ? Object.keys(documentsData[0]) : []
      },
      extracted_data_sample: {
        data: extractedData,
        error: extractedError,
        columns: extractedData && extractedData.length > 0 ? Object.keys(extractedData[0]) : []
      }
    })
  } catch (error) {
    console.error('Table schema debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}