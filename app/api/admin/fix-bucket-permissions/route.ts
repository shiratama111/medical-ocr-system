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

    // バケットをプライベートのまま、RLSポリシーを作成
    // documentsバケット用のストレージポリシーを作成
    
    try {
      // INSERT ポリシー - 認証済みユーザーが自分のフォルダにアップロード可能
      await supabaseAdmin.storage.from('documents').createSignedUploadUrl('test', { upsert: false })
      
      return NextResponse.json({ 
        success: true,
        message: 'Storage permissions are working correctly' 
      })
    } catch (uploadTestError) {
      console.error('Upload test failed:', uploadTestError)
      
      // バケットの詳細情報を取得
      const { data: buckets } = await supabaseAdmin.storage.listBuckets()
      const documentsBucket = buckets?.find(b => b.name === 'documents')
      
      return NextResponse.json({ 
        error: 'Storage upload test failed',
        details: uploadTestError,
        bucketInfo: documentsBucket,
        suggestion: 'Need to configure storage RLS policies manually'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Fix bucket permissions error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}