import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('=== MINIMAL TEST API START ===')
    
    // 1. リクエスト解析テスト
    console.log('1. Parsing request...')
    const body = await request.json()
    console.log('Request body:', body)
    
    const documentId = body.documentId
    if (!documentId) {
      console.log('ERROR: No document ID')
      return NextResponse.json({ error: 'No document ID' }, { status: 400 })
    }
    console.log('Document ID OK:', documentId)

    // 2. 環境変数チェック
    console.log('2. Checking environment...')
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('Has SUPABASE_URL:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Has SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

    // 3. モックレスポンス（実際のDB操作なし）
    console.log('3. Creating mock response...')
    const mockResponse = {
      success: true,
      documentId,
      timestamp: new Date().toISOString(),
      message: 'Minimal test completed successfully'
    }
    
    console.log('=== MINIMAL TEST API SUCCESS ===')
    return NextResponse.json(mockResponse)
    
  } catch (error) {
    console.error('=== MINIMAL TEST API ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', (error as Error).message)
    console.error('Error stack:', (error as Error).stack)
    
    return NextResponse.json(
      { 
        error: 'Minimal test failed',
        details: (error as Error).message 
      },
      { status: 500 }
    )
  }
}