'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/file-upload'
import { DocumentList } from '@/components/document-list'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

interface DashboardClientProps {
  userId: string
}

export default function DashboardClient({ userId }: DashboardClientProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">
            診断書・レセプト データ化システム
          </h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">PDFファイルのアップロード</h2>
          <FileUpload userId={userId} onUploadComplete={handleUploadComplete} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-4">アップロード済みファイル</h2>
          <DocumentList key={refreshKey} userId={userId} />
        </div>
      </main>
    </div>
  )
}