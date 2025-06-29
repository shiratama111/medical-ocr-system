'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DownloadMenu } from '@/components/download-menu'
import { DeleteConfirmationDialog } from '@/components/delete-confirmation-dialog'
import { ProcessingStatus } from '@/components/processing-status'
import { FileText, Edit, Trash2, RefreshCw, Database } from 'lucide-react'
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
  processing_started_at?: string
}

interface DocumentListProps {
  userId: string
  onDocumentsChange?: (documents: Document[]) => void
}

export function DocumentList({ userId, onDocumentsChange }: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; document: Document | null }>({
    open: false,
    document: null
  })
  const supabase = createClient()

  const fetchDocuments = async () => {
    try {
      setRefreshing(true)
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      const docs = data || []
      setDocuments(docs)
      if (onDocumentsChange) {
        onDocumentsChange(docs)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [userId]) // fetchDocuments is stable and doesn't need to be in deps



  const processDocument = async (documentId: string) => {
    try {
      const processingStartTime = new Date().toISOString()
      
      // ステータスを処理中に即座に更新
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { 
            ...doc, 
            status: 'processing',
            processing_started_at: processingStartTime
          } : doc
        )
      )

      // AI-OCR処理をトリガー（簡略版APIを使用）
      let response
      try {
        response = await fetch('/api/process-document-simple', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ documentId })
        })
      } catch (fetchError) {
        console.error('Fetch error:', fetchError)
        throw new Error(`ネットワークエラー: ${(fetchError as Error).message}`)
      }

      if (!response.ok) {
        let errorData
        try {
          errorData = await response.json()
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` }
        }
        throw new Error(`処理に失敗しました: ${errorData.error || response.statusText}`)
      }

      // 処理完了後、ポーリングでステータス更新を待つ
      const pollStatus = async () => {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('id', documentId)
          .single()

        if (!error && data) {
          setDocuments(prev => 
            prev.map(doc => 
              doc.id === documentId ? data : doc
            )
          )
          
          // 処理中でなくなったらポーリング停止
          if (data.status !== 'processing') {
            return
          }
        }
        
        // 2秒後に再度チェック
        setTimeout(pollStatus, 2000)
      }

      // 少し遅延してポーリング開始
      setTimeout(pollStatus, 1000)
    } catch (error) {
      console.error('Error processing document:', error)
      // エラー時はステータスをpendingに戻す
      setDocuments(prev => 
        prev.map(doc => 
          doc.id === documentId ? { ...doc, status: 'pending' } : doc
        )
      )
      alert('処理に失敗しました')
    }
  }

  const deleteDocument = async () => {
    if (!deleteDialog.document) return

    try {
      const response = await fetch(`/api/documents/${deleteDialog.document.id}/delete`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('削除に失敗しました')

      // ドキュメントリストを再取得
      await fetchDocuments()

      // ダイアログを閉じる
      setDeleteDialog({ open: false, document: null })
    } catch (error) {
      console.error('Error deleting document:', error)
      alert('ファイルの削除に失敗しました')
    }
  }

  const syncData = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync_data' })
      })

      if (!response.ok) throw new Error('同期に失敗しました')

      // データ同期後にリフレッシュ
      await fetchDocuments()
      alert('データ同期が完了しました')
    } catch (error) {
      console.error('Error syncing data:', error)
      alert('データ同期に失敗しました')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>
  }

  return (
    <>
      {/* 操作ボタン */}
      <div className="mb-4 flex gap-2 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={fetchDocuments}
          disabled={refreshing}
          className="flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? '更新中...' : '更新'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={syncData}
          disabled={syncing}
          className="flex items-center gap-1"
        >
          <Database className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '同期中...' : 'データ同期'}
        </Button>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600">まだファイルがアップロードされていません</p>
          <p className="text-sm text-gray-500 mt-2">
            データが表示されない場合は「データ同期」ボタンをクリックしてください
          </p>
        </div>
      ) : (
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
                <ProcessingStatus 
                  status={doc.status} 
                  startedAt={doc.processing_started_at}
                />

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
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteDialog({ open: true, document: doc })}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    削除
                  </Button>
                </div>
              </div>
            </div>
          </li>
          ))}
        </ul>
        </div>
      )}
      
      <DeleteConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialog({ open: false, document: null })
          }
        }}
        fileName={deleteDialog.document?.file_name || ''}
        onConfirm={deleteDocument}
      />
    </>
  )
}