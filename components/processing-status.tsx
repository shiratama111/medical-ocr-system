'use client'

import { useEffect, useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { CheckCircle, Clock, AlertCircle } from 'lucide-react'

interface ProcessingStatusProps {
  status: 'pending' | 'processing' | 'review' | 'confirmed'
  startedAt?: string
}

export function ProcessingStatus({ status, startedAt }: ProcessingStatusProps) {
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  useEffect(() => {
    if (status === 'processing' && startedAt) {
      const startTime = new Date(startedAt).getTime()
      
      const updateProgress = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        setElapsedTime(elapsed)
        
        // 進捗バーのシミュレーション（実際の処理時間に基づく）
        // 0-30秒: 0-70%, 30-60秒: 70-90%, 60秒以降: 90-95%
        let progressValue = 0
        if (elapsed <= 30) {
          progressValue = (elapsed / 30) * 70
        } else if (elapsed <= 60) {
          progressValue = 70 + ((elapsed - 30) / 30) * 20
        } else {
          progressValue = 90 + Math.min((elapsed - 60) / 60, 1) * 5
        }
        
        setProgress(Math.min(progressValue, 95))
      }

      // 初回実行
      updateProgress()
      
      // 1秒ごとに更新
      const interval = setInterval(updateProgress, 1000)
      
      return () => clearInterval(interval)
    } else if (status === 'review' || status === 'confirmed') {
      setProgress(100)
    } else {
      setProgress(0)
      setElapsedTime(0)
    }
  }, [status, startedAt])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (status === 'pending') {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Clock className="h-4 w-4" />
        <span className="text-sm">未処理</span>
      </div>
    )
  }

  if (status === 'processing') {
    return (
      <div className="space-y-2 min-w-[200px]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-blue-600 font-medium">OCR処理中...</span>
          <span className="text-xs text-gray-500">{formatTime(elapsedTime)}</span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="text-xs text-gray-500">
          {progress < 30 ? 'ドキュメントを解析中...' :
           progress < 70 ? 'テキストを抽出中...' :
           progress < 90 ? 'データを整理中...' :
           '最終処理中...'}
        </div>
      </div>
    )
  }

  if (status === 'review') {
    return (
      <div className="flex items-center gap-2 text-yellow-600">
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm font-medium">要確認</span>
      </div>
    )
  }

  if (status === 'confirmed') {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">確定済み</span>
      </div>
    )
  }

  return null
}