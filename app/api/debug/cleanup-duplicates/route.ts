import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 重複したレコードを特定
    const { data: extractedData, error: fetchError } = await supabase
      .from('extracted_data')
      .select('*')
      .order('document_id')
      .order('created_at', { ascending: false })

    if (fetchError) {
      return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
    }

    // document_idごとにグループ化し、最新のもの以外を削除対象にする
    const duplicateGroups = new Map()
    const toDelete = []

    for (const record of extractedData || []) {
      const docId = record.document_id
      if (!duplicateGroups.has(docId)) {
        duplicateGroups.set(docId, record) // 最新のレコードを保持
      } else {
        toDelete.push(record.id) // 古いレコードを削除対象に
      }
    }

    console.log('Records to delete:', toDelete)

    // 重複レコードを削除
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('extracted_data')
        .delete()
        .in('id', toDelete)

      if (deleteError) {
        return NextResponse.json({ error: 'Failed to delete duplicates' }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: 'Cleanup completed',
      duplicates_removed: toDelete.length,
      deleted_ids: toDelete
    })
  } catch (error) {
    console.error('Cleanup duplicates error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}