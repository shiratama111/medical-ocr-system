import { DocumentProcessorServiceClient } from '@google-cloud/documentai'

interface DocumentAIConfig {
  projectId: string
  location: string
  processorId: string
  credentials?: string
}

interface ExtractedData {
  patient_name?: string
  hospital_name?: string
  visit_dates?: string[]
  visit_days_count?: number
  inpatient_period?: {
    start_date: string
    end_date: string
    days: number
  }
  total_cost?: number
  cost_breakdown?: {
    item: string
    amount: number
  }[]
  diagnoses?: {
    type: string
    name: string
  }[]
}

export class DocumentAIService {
  private client: DocumentProcessorServiceClient
  private config: DocumentAIConfig

  constructor(config: DocumentAIConfig) {
    this.config = config
    
    // 認証情報の設定
    const clientOptions: { credentials?: object } = {}
    if (config.credentials) {
      // 本番環境: 環境変数から認証情報を読み込み
      try {
        clientOptions.credentials = JSON.parse(config.credentials)
      } catch (error) {
        console.error('Failed to parse Google Cloud credentials:', error)
        throw new Error('Invalid Google Cloud credentials format')
      }
    }
    // ローカル環境: GOOGLE_APPLICATION_CREDENTIALS環境変数を使用
    
    this.client = new DocumentProcessorServiceClient(clientOptions)
  }

  async processDocument(pdfBuffer: Buffer): Promise<ExtractedData> {
    try {
      const name = `projects/${this.config.projectId}/locations/${this.config.location}/processors/${this.config.processorId}`
      
      const request = {
        name,
        rawDocument: {
          content: pdfBuffer.toString('base64'),
          mimeType: 'application/pdf',
        },
      }

      const [result] = await this.client.processDocument(request)
      
      if (!result.document) {
        throw new Error('No document returned from Document AI')
      }

      return this.extractMedicalData(result.document)
    } catch (error) {
      console.error('Document AI processing error:', error)
      throw new Error('Failed to process document with AI-OCR')
    }
  }

  private extractMedicalData(document: { text?: string | null }): ExtractedData {
    const extractedData: ExtractedData = {}
    
    try {
      // テキスト抽出
      const text = document.text || ''
      
      // Note: raw_text removed - using structured data fields instead
      
      // 患者名の抽出
      const patientNameMatch = text.match(/患者.*?[:：]\s*([^\n\r]+)/i) || 
                              text.match(/氏名.*?[:：]\s*([^\n\r]+)/i)
      if (patientNameMatch) {
        extractedData.patient_name = patientNameMatch[1].trim()
      }

      // 病院名の抽出
      const hospitalMatch = text.match(/病院.*?[:：]\s*([^\n\r]+)/i) ||
                           text.match(/医療機関.*?[:：]\s*([^\n\r]+)/i) ||
                           text.match(/([^\n\r]*病院[^\n\r]*)/i)
      if (hospitalMatch) {
        extractedData.hospital_name = hospitalMatch[1].trim()
      }

      // 日付の抽出（通院日）
      const datePattern = /(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]?/g
      const dates: string[] = []
      let dateMatch
      while ((dateMatch = datePattern.exec(text)) !== null) {
        const year = dateMatch[1]
        const month = dateMatch[2].padStart(2, '0')
        const day = dateMatch[3].padStart(2, '0')
        dates.push(`${year}-${month}-${day}`)
      }
      
      if (dates.length > 0) {
        extractedData.visit_dates = [...new Set(dates)].sort()
        extractedData.visit_days_count = extractedData.visit_dates.length
      }

      // 入院期間の抽出
      const inpatientMatch = text.match(/入院.*?(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]?.*?(\d{4})[年\-\/](\d{1,2})[月\-\/](\d{1,2})[日]?/i)
      if (inpatientMatch) {
        const startDate = `${inpatientMatch[1]}-${inpatientMatch[2].padStart(2, '0')}-${inpatientMatch[3].padStart(2, '0')}`
        const endDate = `${inpatientMatch[4]}-${inpatientMatch[5].padStart(2, '0')}-${inpatientMatch[6].padStart(2, '0')}`
        const start = new Date(startDate)
        const end = new Date(endDate)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

        extractedData.inpatient_period = {
          start_date: startDate,
          end_date: endDate,
          days
        }
      }

      // 金額の抽出
      const amountPattern = /[¥￥]?([0-9,]+)円?/g
      const amounts: number[] = []
      let amountMatch
      while ((amountMatch = amountPattern.exec(text)) !== null) {
        const amount = parseInt(amountMatch[1].replace(/,/g, ''))
        if (amount > 0) {
          amounts.push(amount)
        }
      }

      if (amounts.length > 0) {
        extractedData.total_cost = Math.max(...amounts)
        
        // 保険分と自己負担分の抽出を試行
        const costBreakdown: { item: string; amount: number }[] = []
        
        const insuranceMatch = text.match(/保険.*?[¥￥]?([0-9,]+)円?/i)
        if (insuranceMatch) {
          const insuranceAmount = parseInt(insuranceMatch[1].replace(/,/g, ''))
          costBreakdown.push({ item: '健康保険分', amount: insuranceAmount })
        }

        const selfPayMatch = text.match(/自己負担.*?[¥￥]?([0-9,]+)円?/i) ||
                            text.match(/本人負担.*?[¥￥]?([0-9,]+)円?/i)
        if (selfPayMatch) {
          const selfPayAmount = parseInt(selfPayMatch[1].replace(/,/g, ''))
          costBreakdown.push({ item: '本人負担分', amount: selfPayAmount })
        }

        if (costBreakdown.length > 0) {
          extractedData.cost_breakdown = costBreakdown
        }
      }

      // 診断名の抽出
      const diagnoses: { type: string; name: string }[] = []
      
      const mainDiagnosisMatch = text.match(/主.*?病名.*?[:：]\s*([^\n\r]+)/i) ||
                               text.match(/診断.*?[:：]\s*([^\n\r]+)/i)
      if (mainDiagnosisMatch) {
        diagnoses.push({ type: '主傷病名', name: mainDiagnosisMatch[1].trim() })
      }

      const subDiagnosisMatch = text.match(/副.*?病名.*?[:：]\s*([^\n\r]+)/i)
      if (subDiagnosisMatch) {
        diagnoses.push({ type: '副傷病名', name: subDiagnosisMatch[1].trim() })
      }

      if (diagnoses.length > 0) {
        extractedData.diagnoses = diagnoses
      }

    } catch (error) {
      console.error('Error extracting medical data:', error)
    }

    return extractedData
  }
}

export function createDocumentAIService(): DocumentAIService {
  const config: DocumentAIConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID!,
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
    processorId: process.env.GOOGLE_CLOUD_PROCESSOR_ID!,
    credentials: process.env.GOOGLE_CLOUD_CREDENTIALS
  }

  if (!config.projectId || !config.processorId) {
    throw new Error('Google Cloud Document AI configuration is missing')
  }

  return new DocumentAIService(config)
}