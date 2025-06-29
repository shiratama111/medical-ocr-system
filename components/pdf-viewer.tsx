'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface PDFViewerProps {
  fileUrl: string
  fileName: string
}

export function PDFViewer({ fileUrl, fileName }: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        setLoading(true)
        setError(null)

        // Supabaseストレージから署名付きURLを取得
        const { data, error: urlError } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(fileUrl, 3600) // 1時間有効

        if (urlError) {
          throw urlError
        }

        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl)
        }
      } catch (err) {
        console.error('PDF URL fetch error:', err)
        setError('PDFの読み込みに失敗しました')
      } finally {
        setLoading(false)
      }
    }

    if (fileUrl) {
      fetchPdfUrl()
    }
  }, [fileUrl, supabase])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">PDFを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <p className="mt-2 text-sm text-gray-600">ファイル名: {fileName}</p>
        </div>
      </div>
    )
  }

  if (!pdfUrl) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">PDFが見つかりません</p>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <iframe
        src={pdfUrl}
        className="w-full h-full border-0"
        title={fileName}
      />
    </div>
  )
}