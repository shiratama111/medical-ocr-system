'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Bug, TestTube, Database } from 'lucide-react'

interface DebugControlsProps {
  documentId?: string
}

export function DebugControls({ documentId }: DebugControlsProps) {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<string>('')

  const runTest = async (endpoint: string, testName: string) => {
    setTesting(true)
    setResults(`${testName}を実行中...`)
    
    try {
      // 有効なUUIDを生成
      const testDocumentId = documentId || crypto.randomUUID()
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: testDocumentId })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setResults(`✅ ${testName}成功:\n${JSON.stringify(data, null, 2)}`)
      } else {
        setResults(`❌ ${testName}失敗:\n${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      setResults(`💥 ${testName}エラー:\n${(error as Error).message}`)
    } finally {
      setTesting(false)
    }
  }

  const checkDataSync = async () => {
    setTesting(true)
    setResults('データ同期状況を確認中...')
    
    try {
      const response = await fetch('/api/debug/data-sync')
      const data = await response.json()
      
      if (response.ok) {
        setResults(`📊 データ同期状況:\n${JSON.stringify(data, null, 2)}`)
      } else {
        setResults(`❌ データ確認失敗:\n${JSON.stringify(data, null, 2)}`)
      }
    } catch (error) {
      setResults(`💥 データ確認エラー:\n${(error as Error).message}`)
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Bug className="h-4 w-4" />
        デバッグ機能
      </h3>
      
      {documentId ? (
        <p className="text-xs text-gray-600 mb-2">
          テスト対象ドキュメント: <code className="bg-gray-200 px-1 rounded">{documentId}</code>
        </p>
      ) : (
        <p className="text-xs text-yellow-600 mb-2">
          ⚠️ ドキュメントがありません。ランダムなUUIDでテストします。
        </p>
      )}
      
      <div className="flex gap-2 flex-wrap mb-3">
        <Button
          size="sm"
          variant="outline"
          onClick={() => runTest('/api/test-minimal', 'ミニマルテスト')}
          disabled={testing}
        >
          <TestTube className="h-3 w-3 mr-1" />
          最小テスト
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={() => runTest('/api/process-document-simple', '簡略処理テスト')}
          disabled={testing}
        >
          <TestTube className="h-3 w-3 mr-1" />
          処理テスト
        </Button>
        
        <Button
          size="sm"
          variant="outline"
          onClick={checkDataSync}
          disabled={testing}
        >
          <Database className="h-3 w-3 mr-1" />
          データ確認
        </Button>
      </div>
      
      {results && (
        <div className="bg-white p-3 rounded border">
          <pre className="text-xs whitespace-pre-wrap overflow-auto max-h-64">
            {results}
          </pre>
        </div>
      )}
    </div>
  )
}