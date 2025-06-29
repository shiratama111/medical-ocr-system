import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // Storageからファイルを削除
    if (document.file_url) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.file_url])

      if (storageError) {
        console.error('Storage deletion error:', storageError)
        // ストレージ削除のエラーは警告のみ（データベースの削除は続行）
      }
    }

    // 関連する抽出データを削除
    const { error: extractedDataError } = await supabase
      .from('extracted_data')
      .delete()
      .eq('document_id', id)

    if (extractedDataError) {
      console.error('Extracted data deletion error:', extractedDataError)
    }

    // データベースからドキュメントレコードを削除
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Delete document error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}