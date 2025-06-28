import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import DocumentEditClient from './document-edit-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function DocumentEditPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }

  // ドキュメントの取得
  const { data: document, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (docError || !document) {
    notFound()
  }

  // 抽出データの取得
  const { data: extractedData, error: dataError } = await supabase
    .from('extracted_data')
    .select('*')
    .eq('document_id', id)
    .single()

  if (dataError) {
    console.error('Error fetching extracted data:', dataError)
  }

  return (
    <DocumentEditClient 
      document={document}
      extractedData={extractedData}
      userId={user.id}
    />
  )
}