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

    // ストレージバケットの存在確認
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    console.log('Existing buckets:', buckets)
    console.log('List buckets error:', listError)

    const documentsBucket = buckets?.find(bucket => bucket.name === 'documents')
    
    if (!documentsBucket) {
      // バケットが存在しない場合、手動での作成が必要
      return NextResponse.json({ 
        error: 'Documents bucket does not exist',
        message: 'Please create a "documents" bucket in Supabase Storage dashboard',
        buckets: buckets?.map(b => b.name) || []
      }, { status: 404 })
    }

    // テストファイルのアップロードを試行
    const testFileName = `test/${user.id}/test.txt`
    const testContent = new Blob(['test'], { type: 'text/plain' })
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testContent, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Test upload error:', uploadError)
      return NextResponse.json({
        error: 'Storage upload test failed',
        details: uploadError.message,
        buckets: buckets?.map(b => b.name) || []
      }, { status: 500 })
    }

    // テストファイルを削除
    await supabase.storage
      .from('documents')
      .remove([testFileName])

    return NextResponse.json({ 
      success: true, 
      message: 'Storage is properly configured',
      buckets: buckets?.map(b => b.name) || []
    })
  } catch (error) {
    console.error('Storage setup error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}