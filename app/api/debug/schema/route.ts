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

    // テーブル構造を確認
    const { data: documentsSchema, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .limit(1)

    const { data: extractedSchema, error: extractedError } = await supabase
      .from('extracted_data')
      .select('*')
      .limit(1)

    return NextResponse.json({
      documents_table: {
        sample: documentsSchema,
        error: docsError
      },
      extracted_data_table: {
        sample: extractedSchema,
        error: extractedError
      }
    })
  } catch (error) {
    console.error('Schema debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}