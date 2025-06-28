'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DownloadMenu } from '@/components/download-menu'
import { FileText, Edit, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'

interface Document {
  id: string
  file_name: string
  file_url: string
  status: 'pending' | 'processing' | 'review' | 'confirmed'
  created_at: string
  updated_at: string
}

interface DocumentListProps {
  userId: string
}

export function DocumentList({ userId }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        setDocuments(data || [])
      } catch (error) {
        console.error('Error fetching documents:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchDocuments()
  }, [userId, supabase])


  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />
      case 'processing':
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'review':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'confirmed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusText = (status: Document['status']) => {
    switch (status) {
      case 'pending':
        return '未処理'
      case 'processing':
        return '処理中'
      case 'review':
        return '要確認'
      case 'confirmed':
        return '確定済み'
    }
  }

  const processDocument = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ status: 'processing' })
        .eq('id', documentId)

      if (error) throw error

      // AI-OCR処理をトリガー（実際の実装では、ここでAPIルートを呼び出す）
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      })

      if (!response.ok) throw new Error('処理に失敗しました')

      // ドキュメントリストを再取得
      window.location.reload()
    } catch (error) {
      console.error('Error processing document:', error)
    }
  }

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-gray-600">まだファイルがアップロードされていません</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <ul className="divide-y divide-gray-200">
        {documents.map((doc) => (
          <li key={doc.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="h-10 w-10 text-gray-400 mr-4" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{doc.file_name}</p>
                  <p className="text-sm text-gray-500">
                    {format(new Date(doc.created_at), 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(doc.status)}
                  <span className="text-sm text-gray-600">{getStatusText(doc.status)}</span>
                </div>

                <div className="flex space-x-2">
                  {doc.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => processDocument(doc.id)}
                      className="flex items-center gap-1"
                    >
                      処理開始
                    </Button>
                  )}
                  
                  {(doc.status === 'review' || doc.status === 'confirmed') && (
                    <>
                      <Link href={`/dashboard/document/${doc.id}`}>
                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                          <Edit className="h-3 w-3" />
                          編集
                        </Button>
                      </Link>
                      
                      {doc.status === 'confirmed' && (
                        <DownloadMenu documentId={doc.id} fileName={doc.file_name} />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}