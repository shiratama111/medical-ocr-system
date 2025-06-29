import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // URLパラメータからdocument_idを取得
    const url = new URL(request.url)
    const documentId = url.searchParams.get('document_id')

    let query = supabase
      .from('extracted_data')
      .select('*')

    if (documentId) {
      query = query.eq('document_id', documentId)
    }

    const { data: extractedData, error: extractedError } = await query

    // ドキュメント情報も取得
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)

    return NextResponse.json({
      user_id: user.id,
      query_document_id: documentId,
      extracted_data: {
        data: extractedData,
        error: extractedError,
        count: extractedData?.length || 0
      },
      documents: {
        data: documents,
        error: docsError,
        count: documents?.length || 0
      },
      debug_info: {
        request_url: request.url,
        search_params: Object.fromEntries(url.searchParams.entries())
      }
    })
  } catch (error) {
    console.error('Debug extracted data error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}