'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ChevronDown } from 'lucide-react'

interface DownloadMenuProps {
  documentId: string
  fileName: string
}

export function DownloadMenu({ documentId, fileName }: DownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async (format: 'json' | 'csv' | 'txt') => {
    setIsDownloading(true)
    setIsOpen(false)

    try {
      let response
      if (format === 'txt') {
        response = await fetch(`/api/documents/${documentId}/download-text`)
      } else {
        response = await fetch(`/api/documents/${documentId}/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ format })
        })
      }

      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      
      const extension = format === 'csv' ? 'csv' : format === 'txt' ? 'txt' : 'json'
      const fileType = format === 'txt' ? 'ocr' : 'extracted_data'
      link.download = `${fileName.replace('.pdf', '')}_${fileType}.${extension}`
      
      window.document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      window.document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      alert('ダウンロードに失敗しました')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isDownloading}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {isDownloading ? 'ダウンロード中...' : 'ダウンロード'}
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
          <div className="py-1">
            <button
              onClick={() => handleDownload('txt')}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              OCRテキスト（.txt）
            </button>
            <button
              onClick={() => handleDownload('json')}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              JSON形式でダウンロード
            </button>
            <button
              onClick={() => handleDownload('csv')}
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
            >
              CSV形式でダウンロード
            </button>
          </div>
        </div>
      )}

      {/* 背景クリックで閉じる */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}