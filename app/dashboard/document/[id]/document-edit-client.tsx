'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Save, Download, FileText } from 'lucide-react'
import { PDFViewer } from '@/components/pdf-viewer'

interface Document {
  id: string
  file_name: string
  file_url: string
  status: string
  created_at: string
}

interface ExtractedData {
  id: string
  document_id: string
  patient_name: string | null
  hospital_name: string | null
  visit_dates: string[] | null
  visit_days_count: number | null
  inpatient_period: {
    start_date: string | null
    end_date: string | null
    days: number | null
  } | null
  total_cost: number | null
  cost_breakdown: {
    item: string
    amount: number
  }[] | null
  diagnoses: {
    type: string
    name: string
  }[] | null
}

interface DocumentEditClientProps {
  document: Document
  extractedData: ExtractedData | null
  userId: string
}

export default function DocumentEditClient({ 
  document, 
  extractedData: initialData 
}: DocumentEditClientProps) {
  const [extractedData, setExtractedData] = useState(initialData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleInputChange = (
    field: string, 
    value: string | number | null | { type: string; name: string }[] | { item: string; amount: number }[] | { start_date?: string | null; end_date?: string | null; days?: number | null }
  ) => {
    if (!extractedData) return
    
    setExtractedData({
      ...extractedData,
      [field]: value
    })
  }

  const handleArrayChange = (field: string, index: number, value: string) => {
    if (!extractedData) return
    
    const currentArray = extractedData[field as keyof ExtractedData] as string[] || []
    const newArray = [...currentArray]
    newArray[index] = value
    
    setExtractedData({
      ...extractedData,
      [field]: newArray
    })
  }

  const addArrayItem = (field: string) => {
    if (!extractedData) return
    
    const currentArray = extractedData[field as keyof ExtractedData] as string[] || []
    
    setExtractedData({
      ...extractedData,
      [field]: [...currentArray, '']
    })
  }

  const removeArrayItem = (field: string, index: number) => {
    if (!extractedData) return
    
    const currentArray = extractedData[field as keyof ExtractedData] as string[] || []
    const newArray = currentArray.filter((_, i) => i !== index)
    
    setExtractedData({
      ...extractedData,
      [field]: newArray,
      visit_days_count: field === 'visit_dates' ? newArray.length : extractedData.visit_days_count
    })
  }

  const validateData = () => {
    const errors: string[] = []
    
    // 必須項目のチェック
    if (!extractedData?.patient_name?.trim()) {
      errors.push('患者名は必須項目です')
    }
    
    if (!extractedData?.hospital_name?.trim()) {
      errors.push('医療機関名は必須項目です')
    }
    
    // 日付フォーマットのチェック
    if (extractedData?.visit_dates) {
      extractedData.visit_dates.forEach((date, index) => {
        if (date && !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          errors.push(`通院日${index + 1}の日付形式が正しくありません`)
        }
      })
    }
    
    // 入院期間の妥当性チェック
    if (extractedData?.inpatient_period?.start_date && extractedData?.inpatient_period?.end_date) {
      const start = new Date(extractedData.inpatient_period.start_date)
      const end = new Date(extractedData.inpatient_period.end_date)
      if (start > end) {
        errors.push('入院開始日は終了日より前の日付である必要があります')
      }
    }
    
    // 金額の妥当性チェック
    if (extractedData?.total_cost !== undefined && extractedData.total_cost !== null && extractedData.total_cost < 0) {
      errors.push('治療費総額は0以上の値を入力してください')
    }
    
    if (extractedData?.cost_breakdown) {
      extractedData.cost_breakdown.forEach((item, index) => {
        if (!item.item?.trim()) {
          errors.push(`費用内訳${index + 1}の項目名を入力してください`)
        }
        if (item.amount < 0) {
          errors.push(`費用内訳${index + 1}の金額は0以上の値を入力してください`)
        }
      })
    }
    
    // 診断名のチェック
    if (extractedData?.diagnoses) {
      extractedData.diagnoses.forEach((diag, index) => {
        if (!diag.name?.trim()) {
          errors.push(`診断名${index + 1}を入力してください`)
        }
      })
    }
    
    return errors
  }

  const handleSave = async () => {
    if (!extractedData) return
    
    // バリデーション
    const validationErrors = validateData()
    if (validationErrors.length > 0) {
      setError(validationErrors.join('、'))
      return
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      // visit_days_countを自動計算
      const updatedData = {
        ...extractedData,
        visit_days_count: extractedData.visit_dates?.length || 0
      }
      
      const { error: updateError } = await supabase
        .from('extracted_data')
        .update(updatedData)
        .eq('id', extractedData.id)

      if (updateError) throw updateError

      // ドキュメントステータスを確定済みに更新
      await supabase
        .from('documents')
        .update({ status: 'confirmed' })
        .eq('id', document.id)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError('保存に失敗しました')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!extractedData) return

    try {
      const response = await fetch(`/api/documents/${document.id}/download`)
      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = `${document.file_name.replace('.pdf', '')}_extracted_data.json`
      window.document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      window.document.body.removeChild(link)
    } catch (err) {
      setError('ダウンロードに失敗しました')
      console.error(err)
    }
  }

  if (!extractedData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-gray-600">データが見つかりません</p>
            <Link href="/dashboard">
              <Button className="mt-4">ダッシュボードに戻る</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  戻る
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">データ確認・修正</h1>
                <p className="text-sm text-gray-600">{document.file_name}</p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button onClick={handleDownload} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                ダウンロード
              </Button>
              <Button onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                {isLoading ? '保存中...' : '保存'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* PDF表示エリア */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              原本PDF
            </h2>
            <div className="border rounded-lg bg-gray-50 h-[600px] overflow-hidden">
              <PDFViewer fileUrl={document.file_url} fileName={document.file_name} />
            </div>
          </div>

          {/* データ編集エリア */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">抽出データ</h2>
            
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800">データを保存しました</p>
              </div>
            )}

            <div className="space-y-6">
              {/* 基本情報 */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">基本情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      患者名
                    </label>
                    <input
                      type="text"
                      value={extractedData.patient_name || ''}
                      onChange={(e) => handleInputChange('patient_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      医療機関名
                    </label>
                    <input
                      type="text"
                      value={extractedData.hospital_name || ''}
                      onChange={(e) => handleInputChange('hospital_name', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* 通院日 */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">通院日</h3>
                <div className="space-y-2">
                  {extractedData.visit_dates?.map((date, index) => (
                    <div key={index} className="flex space-x-2">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => handleArrayChange('visit_dates', index, e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeArrayItem('visit_dates', index)}
                      >
                        削除
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem('visit_dates')}
                  >
                    通院日を追加
                  </Button>
                  <p className="text-sm text-gray-600">
                    実通院日数: {extractedData.visit_dates?.length || 0}日
                  </p>
                </div>
              </div>

              {/* 入院期間 */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">入院期間</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        入院開始日
                      </label>
                      <input
                        type="date"
                        value={extractedData.inpatient_period?.start_date || ''}
                        onChange={(e) => {
                          const newPeriod = {
                            ...extractedData.inpatient_period,
                            start_date: e.target.value
                          }
                          // 日数を再計算
                          if (newPeriod.start_date && newPeriod.end_date) {
                            const start = new Date(newPeriod.start_date)
                            const end = new Date(newPeriod.end_date)
                            newPeriod.days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                          }
                          handleInputChange('inpatient_period', newPeriod)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        入院終了日
                      </label>
                      <input
                        type="date"
                        value={extractedData.inpatient_period?.end_date || ''}
                        onChange={(e) => {
                          const newPeriod = {
                            ...extractedData.inpatient_period,
                            end_date: e.target.value
                          }
                          // 日数を再計算
                          if (newPeriod.start_date && newPeriod.end_date) {
                            const start = new Date(newPeriod.start_date)
                            const end = new Date(newPeriod.end_date)
                            newPeriod.days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1)
                          }
                          handleInputChange('inpatient_period', newPeriod)
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    入院日数: {extractedData.inpatient_period?.days || 0}日
                  </p>
                </div>
              </div>

              {/* 金額情報 */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">金額情報</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      治療費総額（円）
                    </label>
                    <input
                      type="number"
                      value={extractedData.total_cost || ''}
                      onChange={(e) => handleInputChange('total_cost', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  
                  {/* 費用内訳 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      費用内訳
                    </label>
                    <div className="space-y-2">
                      {extractedData.cost_breakdown?.map((item, index) => (
                        <div key={index} className="flex space-x-2">
                          <input
                            type="text"
                            value={item.item}
                            onChange={(e) => {
                              const newBreakdown = [...(extractedData.cost_breakdown || [])]
                              newBreakdown[index] = { ...item, item: e.target.value }
                              handleInputChange('cost_breakdown', newBreakdown)
                            }}
                            placeholder="項目名"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <input
                            type="number"
                            value={item.amount}
                            onChange={(e) => {
                              const newBreakdown = [...(extractedData.cost_breakdown || [])]
                              newBreakdown[index] = { ...item, amount: parseInt(e.target.value) || 0 }
                              handleInputChange('cost_breakdown', newBreakdown)
                            }}
                            placeholder="金額"
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newBreakdown = extractedData.cost_breakdown?.filter((_, i) => i !== index) || []
                              handleInputChange('cost_breakdown', newBreakdown)
                            }}
                          >
                            削除
                          </Button>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const newBreakdown = [...(extractedData.cost_breakdown || []), { item: '', amount: 0 }]
                          handleInputChange('cost_breakdown', newBreakdown)
                        }}
                      >
                        内訳を追加
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 診断名 */}
              <div>
                <h3 className="font-medium text-gray-900 mb-3">診断名</h3>
                <div className="space-y-2">
                  {extractedData.diagnoses?.map((diagnosis, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                      <select
                        value={diagnosis.type}
                        onChange={(e) => {
                          const newDiagnoses = [...(extractedData.diagnoses || [])]
                          newDiagnoses[index] = { ...diagnosis, type: e.target.value }
                          handleInputChange('diagnoses', newDiagnoses)
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="主傷病名">主傷病名</option>
                        <option value="副傷病名">副傷病名</option>
                      </select>
                      <input
                        type="text"
                        value={diagnosis.name}
                        onChange={(e) => {
                          const newDiagnoses = [...(extractedData.diagnoses || [])]
                          newDiagnoses[index] = { ...diagnosis, name: e.target.value }
                          handleInputChange('diagnoses', newDiagnoses)
                        }}
                        className="col-span-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="診断名を入力"
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newDiagnoses = [...(extractedData.diagnoses || []), { type: '主傷病名', name: '' }]
                      handleInputChange('diagnoses', newDiagnoses)
                    }}
                  >
                    診断名を追加
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}