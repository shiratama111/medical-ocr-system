import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Service role keyが必要（環境変数から取得）
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    console.log('Service role key exists:', !!serviceRoleKey)
    console.log('Supabase URL:', supabaseUrl)
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ 
        error: 'Missing service role key or URL',
        hasServiceKey: !!serviceRoleKey,
        hasUrl: !!supabaseUrl
      }, { status: 500 })
    }

    // Service roleクライアントを作成
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // バケットの存在確認
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const existingBucket = buckets?.find(bucket => bucket.name === 'documents')
    
    if (existingBucket) {
      return NextResponse.json({ 
        message: 'Bucket already exists',
        bucket: existingBucket 
      })
    }

    // documentsバケットを作成
    const { data, error } = await supabaseAdmin.storage.createBucket('documents', {
      public: false,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 52428800 // 50MB
    })

    if (error) {
      console.error('Bucket creation error:', error)
      return NextResponse.json({ 
        error: 'Failed to create bucket',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Documents bucket created successfully',
      bucket: data 
    })
  } catch (error) {
    console.error('Create bucket error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}