import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ 
        error: 'Missing service role key or URL' 
      }, { status: 500 })
    }

    // Service roleクライアントを作成
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // RLSを有効にする
    const { error: rlsError } = await supabaseAdmin
      .from('storage.objects')
      .update({}) // ダミーupdate to enable RLS
      .eq('bucket_id', 'documents')

    console.log('RLS check result:', rlsError)

    // バケットのポリシー設定をチェック
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .from('documents')
      .list()

    console.log('Bucket access test:', { bucketData, bucketError })

    // バケットアクセステスト結果を返す
    return NextResponse.json({ 
      success: true,
      message: 'Storage access tested',
      bucketError: bucketError?.message,
      bucketData: bucketData ? 'accessible' : 'not accessible'
    })
  } catch (error) {
    console.error('Setup storage policies error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}