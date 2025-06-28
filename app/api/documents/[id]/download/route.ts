import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params
    
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

    // 抽出データの取得
    const { data: extractedData, error: dataError } = await supabase
      .from('extracted_data')
      .select('*')
      .eq('document_id', id)
      .single()

    if (dataError || !extractedData) {
      return NextResponse.json({ error: 'Extracted data not found' }, { status: 404 })
    }

    // JSONデータの準備
    const exportData = {
      file_id: document.id,
      file_name: document.file_name,
      status: document.status,
      patient_name: extractedData.patient_name,
      hospital_name: extractedData.hospital_name,
      visit_dates: extractedData.visit_dates || [],
      visit_days_count: extractedData.visit_days_count || 0,
      inpatient_period: extractedData.inpatient_period,
      total_cost: extractedData.total_cost,
      cost_breakdown: extractedData.cost_breakdown || [],
      diagnoses: extractedData.diagnoses || [],
      last_updated_at: extractedData.updated_at,
      exported_at: new Date().toISOString()
    }

    // Content-Typeを指定してJSONとして返す
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${document.file_name.replace('.pdf', '')}_extracted_data.json"`
      }
    })
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { format } = await request.json()
    const supabase = await createClient()
    const { id } = await params
    
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

    // 抽出データの取得
    const { data: extractedData, error: dataError } = await supabase
      .from('extracted_data')
      .select('*')
      .eq('document_id', id)
      .single()

    if (dataError || !extractedData) {
      return NextResponse.json({ error: 'Extracted data not found' }, { status: 404 })
    }

    if (format === 'csv') {
      // CSV形式での出力
      const csvData = generateCSV(document, extractedData)
      
      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${document.file_name.replace('.pdf', '')}_extracted_data.csv"`
        }
      })
    } else {
      // JSON形式での出力（デフォルト）
      const exportData = {
        file_id: document.id,
        file_name: document.file_name,
        status: document.status,
        patient_name: extractedData.patient_name,
        hospital_name: extractedData.hospital_name,
        visit_dates: extractedData.visit_dates || [],
        visit_days_count: extractedData.visit_days_count || 0,
        inpatient_period: extractedData.inpatient_period,
        total_cost: extractedData.total_cost,
        cost_breakdown: extractedData.cost_breakdown || [],
        diagnoses: extractedData.diagnoses || [],
        last_updated_at: extractedData.updated_at,
        exported_at: new Date().toISOString()
      }

      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${document.file_name.replace('.pdf', '')}_extracted_data.json"`
        }
      })
    }
  } catch (error) {
    console.error('Download error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateCSV(document: { id: string; file_name: string; status: string }, extractedData: { 
  patient_name?: string | null;
  hospital_name?: string | null;
  visit_dates?: string[] | null;
  visit_days_count?: number | null;
  inpatient_period?: { start_date?: string | null; end_date?: string | null; days?: number | null } | null;
  total_cost?: number | null;
  cost_breakdown?: { item: string; amount: number }[] | null;
  diagnoses?: { type: string; name: string }[] | null;
  updated_at: string;
}): string {
  const headers = [
    'ファイルID',
    'ファイル名',
    'ステータス',
    '患者名',
    '医療機関名',
    '通院日',
    '実通院日数',
    '入院開始日',
    '入院終了日',
    '入院日数',
    '治療費総額',
    '費用内訳',
    '診断名',
    '最終更新日',
    'エクスポート日'
  ]

  const visitDates = extractedData.visit_dates ? extractedData.visit_dates.join(';') : ''
  const costBreakdown = extractedData.cost_breakdown ? 
    extractedData.cost_breakdown.map((item) => `${item.item}:${item.amount}`).join(';') : ''
  const diagnoses = extractedData.diagnoses ?
    extractedData.diagnoses.map((diag) => `${diag.type}:${diag.name}`).join(';') : ''

  const row = [
    document.id,
    document.file_name,
    document.status,
    extractedData.patient_name || '',
    extractedData.hospital_name || '',
    visitDates,
    extractedData.visit_days_count || 0,
    extractedData.inpatient_period?.start_date || '',
    extractedData.inpatient_period?.end_date || '',
    extractedData.inpatient_period?.days || 0,
    extractedData.total_cost || 0,
    costBreakdown,
    diagnoses,
    extractedData.updated_at,
    new Date().toISOString()
  ]

  // CSVエスケープ処理
  const escapeCsvField = (field: string | number): string => {
    const str = String(field)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  return [
    headers.join(','),
    row.map(escapeCsvField).join(',')
  ].join('\n')
}