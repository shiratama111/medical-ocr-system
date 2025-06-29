import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // 基本的なテスト
    console.log('Test process API called')
    
    // モックデータを作成
    const testData = {
      document_id: 'test-123',
      raw_text: 'テストデータ',
      patient_name: 'テスト太郎',
      hospital_name: 'テスト病院',
      visit_dates: ['2024-01-01'],
      visit_days_count: 1,
      total_cost: 10000,
      cost_breakdown: [{ item: 'テスト', amount: 10000 }],
      diagnoses: [{ type: '主傷病名', name: 'テスト病名' }],
      inpatient_period: null
    }
    
    console.log('Test data created:', testData)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test completed successfully',
      data: testData 
    })
  } catch (error) {
    console.error('Test error:', error)
    return NextResponse.json(
      { error: `Test failed: ${(error as Error).message}` },
      { status: 500 }
    )
  }
}