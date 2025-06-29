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

    // すべてのドキュメントを取得
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // 抽出データを取得
    const { data: extractedData, error: extractedError } = await supabase
      .from('extracted_data')
      .select('*')

    // ストレージ内のファイルリストを取得
    const { data: storageFiles, error: storageError } = await supabase.storage
      .from('documents')
      .list(user.id, {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      })

    return NextResponse.json({
      user_id: user.id,
      database: {
        documents: {
          count: documents?.length || 0,
          data: documents,
          error: docsError
        },
        extracted_data: {
          count: extractedData?.length || 0,
          data: extractedData,
          error: extractedError
        }
      },
      storage: {
        files: {
          count: storageFiles?.length || 0,
          data: storageFiles,
          error: storageError
        }
      },
      sync_analysis: {
        documents_without_storage: documents?.filter(doc => 
          !storageFiles?.some(file => doc.file_url.includes(file.name))
        ) || [],
        storage_without_documents: storageFiles?.filter(file => 
          !documents?.some(doc => doc.file_url.includes(file.name))
        ) || []
      }
    })
  } catch (error) {
    console.error('Data sync debug error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}