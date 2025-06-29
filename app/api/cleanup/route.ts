import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action } = await request.json()

    if (action === 'sync_data') {
      // 1. ストレージ内のファイルリストを取得
      const { data: storageFiles, error: storageError } = await supabase.storage
        .from('documents')
        .list(user.id, { limit: 100 })

      if (storageError) {
        console.error('Storage list error:', storageError)
        return NextResponse.json({ error: 'Failed to list storage files' }, { status: 500 })
      }

      // 2. データベース内のドキュメントを取得
      const { data: documents, error: docsError } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)

      if (docsError) {
        console.error('Documents fetch error:', docsError)
        return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
      }

      // 3. ストレージにないファイルのDBレコードを削除
      const orphanedDocuments = documents?.filter(doc => 
        !storageFiles?.some(file => doc.file_url.includes(file.name))
      ) || []

      for (const orphanDoc of orphanedDocuments) {
        // 抽出データを削除
        await supabase
          .from('extracted_data')
          .delete()
          .eq('document_id', orphanDoc.id)

        // ドキュメントレコードを削除
        await supabase
          .from('documents')
          .delete()
          .eq('id', orphanDoc.id)
      }

      // 4. DBにないファイルのストレージを削除
      const orphanedFiles = storageFiles?.filter(file => 
        !documents?.some(doc => doc.file_url.includes(file.name))
      ) || []

      for (const orphanFile of orphanedFiles) {
        await supabase.storage
          .from('documents')
          .remove([`${user.id}/${orphanFile.name}`])
      }

      return NextResponse.json({
        success: true,
        cleaned: {
          orphaned_documents: orphanedDocuments.length,
          orphaned_files: orphanedFiles.length
        }
      })
    }

    if (action === 'clear_all_user_data') {
      // 全てのユーザーデータを削除
      
      // 1. 抽出データを削除
      await supabase
        .from('extracted_data')
        .delete()
        .in('document_id', 
          (await supabase
            .from('documents')
            .select('id')
            .eq('user_id', user.id)
          ).data?.map(d => d.id) || []
        )

      // 2. ドキュメントレコードを削除
      await supabase
        .from('documents')
        .delete()
        .eq('user_id', user.id)

      // 3. ストレージファイルを削除
      const { data: storageFiles } = await supabase.storage
        .from('documents')
        .list(user.id, { limit: 100 })

      if (storageFiles && storageFiles.length > 0) {
        const filePaths = storageFiles.map(file => `${user.id}/${file.name}`)
        await supabase.storage
          .from('documents')
          .remove(filePaths)
      }

      return NextResponse.json({
        success: true,
        message: 'All user data cleared'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}