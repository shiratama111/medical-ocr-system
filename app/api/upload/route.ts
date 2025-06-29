import { NextRequest, NextResponse } from 'next/server'
import { createClient as createClientServer } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const supabase = await createClientServer()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // FormDataを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    console.log(`Server upload: ${file.name}, size: ${file.size} bytes`)

    // Service role keyでSupabaseクライアントを作成
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json({ 
        error: 'Server configuration error' 
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // ストレージ用のファイル名（UUIDのみ使用）
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'pdf'
    const fileUuid = randomUUID()
    const storageFileName = `${user.id}/${fileUuid}.${fileExtension}`
    
    console.log(`Original filename: ${file.name}`)
    console.log(`Storage filename: ${storageFileName}`)
    const fileArrayBuffer = await file.arrayBuffer()
    
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(storageFileName, fileArrayBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Server upload error:', uploadError)
      return NextResponse.json({ 
        error: `Upload failed: ${uploadError.message}` 
      }, { status: 500 })
    }

    // データベースに記録（元のファイル名はDBにのみ保存）
    const { data: dbData, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: user.id,
        file_name: file.name,  // 元のファイル名を保存
        file_url: storageFileName,  // UUID形式のストレージパスを保存
        status: 'pending'
      })
      .select()

    if (dbError) {
      console.error('Database insert error:', dbError)
      return NextResponse.json({ 
        error: `Database error: ${dbError.message}` 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'File uploaded successfully',
      data: dbData[0]
    })
  } catch (error) {
    console.error('Upload API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}