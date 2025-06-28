export interface ExtractedData {
  file_id: string
  file_name: string
  status: 'pending' | 'processing' | 'review' | 'confirmed'
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
  last_updated_at: string
}