import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

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
      .eq('id', documentId)
      .eq('user_id', user.id)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // 処理ステータスを更新
    await supabase
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // TODO: ここでGoogle Cloud Document AIを呼び出す
    // 現在はモックデータを作成
    const mockExtractedData = {
      document_id: documentId,
      patient_name: '田中 太郎',
      hospital_name: '〇〇総合病院',
      visit_dates: ['2024-06-01', '2024-06-08', '2024-06-15'],
      visit_days_count: 3,
      inpatient_period: {
        start_date: '2024-05-25',
        end_date: '2024-05-30',
        days: 6
      },
      total_cost: 150000,
      cost_breakdown: [
        { item: '健康保険分', amount: 105000 },
        { item: '本人負担分', amount: 45000 }
      ],
      diagnoses: [
        { type: '主傷病名', name: '右大腿骨頸部骨折' },
        { type: '副傷病名', name: '高血圧症' }
      ]
    }

    // 抽出データを保存
    const { error: insertError } = await supabase
      .from('extracted_data')
      .upsert(mockExtractedData)

    if (insertError) {
      throw insertError
    }

    // ステータスをレビューに更新
    await supabase
      .from('documents')
      .update({ status: 'review' })
      .eq('id', documentId)

    return NextResponse.json({ success: true, message: 'Document processed successfully' })
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}