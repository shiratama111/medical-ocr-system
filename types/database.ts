export interface Database {
  public: {
    Tables: {
      documents: {
        Row: {
          id: string
          user_id: string
          file_name: string
          file_url: string
          status: 'pending' | 'processing' | 'review' | 'confirmed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          file_name: string
          file_url: string
          status?: 'pending' | 'processing' | 'review' | 'confirmed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          file_name?: string
          file_url?: string
          status?: 'pending' | 'processing' | 'review' | 'confirmed'
          created_at?: string
          updated_at?: string
        }
      }
      extracted_data: {
        Row: {
          id: string
          document_id: string
          patient_name: string | null
          hospital_name: string | null
          visit_dates: string[] | null
          visit_days_count: number | null
          inpatient_period: {
            start_date: string | null
            end_date: string | null
            days: number | null
          } | null
          total_cost: number | null
          cost_breakdown: {
            item: string
            amount: number
          }[] | null
          diagnoses: {
            type: string
            name: string
          }[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          document_id: string
          patient_name?: string | null
          hospital_name?: string | null
          visit_dates?: string[] | null
          visit_days_count?: number | null
          inpatient_period?: {
            start_date: string | null
            end_date: string | null
            days: number | null
          } | null
          total_cost?: number | null
          cost_breakdown?: {
            item: string
            amount: number
          }[] | null
          diagnoses?: {
            type: string
            name: string
          }[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          document_id?: string
          patient_name?: string | null
          hospital_name?: string | null
          visit_dates?: string[] | null
          visit_days_count?: number | null
          inpatient_period?: {
            start_date: string | null
            end_date: string | null
            days: number | null
          } | null
          total_cost?: number | null
          cost_breakdown?: {
            item: string
            amount: number
          }[] | null
          diagnoses?: {
            type: string
            name: string
          }[] | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}