'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface FileUploadProps {
  userId: string
  onUploadComplete?: () => void
}

export function FileUpload({ userId, onUploadComplete }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([])
  const supabase = createClient()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    setError(null)
    const uploaded: string[] = []

    try {
      for (const file of acceptedFiles) {
        if (file.size > 20 * 1024 * 1024) {
          setError(`ファイル "${file.name}" は20MBを超えています`)
          continue
        }

        // Supabase Storageにアップロード
        const fileName = `${userId}/${Date.now()}_${file.name}`
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError

        // データベースに記録
        const { data: fileUrl } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName)

        const { error: dbError } = await supabase
          .from('documents')
          .insert({
            user_id: userId,
            file_name: file.name,
            file_url: fileUrl.publicUrl,
            status: 'pending'
          })

        if (dbError) throw dbError

        uploaded.push(file.name)
      }

      setUploadedFiles(uploaded)
      if (onUploadComplete) onUploadComplete()
    } catch (err) {
      setError('アップロードに失敗しました')
      console.error(err)
    } finally {
      setUploading(false)
    }
  }, [userId, supabase, onUploadComplete])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    multiple: true,
    disabled: uploading
  })

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600">ファイルをドロップしてください</p>
        ) : (
          <div>
            <p className="text-gray-600 mb-2">
              PDFファイルをドラッグ＆ドロップ
            </p>
            <p className="text-sm text-gray-500">
              または<span className="text-blue-600 hover:underline">ファイルを選択</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              最大ファイルサイズ: 20MB
            </p>
          </div>
        )}
      </div>

      {uploading && (
        <div className="mt-4">
          <p className="text-sm text-gray-600">アップロード中...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-md flex items-start">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="mt-4 p-4 bg-green-50 rounded-md">
          <p className="text-sm font-medium text-green-800 mb-2">
            アップロード完了:
          </p>
          <ul className="text-sm text-green-700 space-y-1">
            {uploadedFiles.map((fileName, index) => (
              <li key={index} className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                {fileName}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}