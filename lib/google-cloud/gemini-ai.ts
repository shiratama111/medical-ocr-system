import { GoogleGenerativeAI } from "@google/generative-ai";

// 抽出結果の型定義
export interface ExtractedData {
  patient_name?: string;
  hospital_name?: string;
  visit_dates?: string[];
  visit_days_count?: number;
  inpatient_period?: {
    start_date?: string;
    end_date?: string;
    days?: number;
  };
  total_cost?: number;
  cost_breakdown?: Array<{
    item: string;
    amount: number;
  }>;
  diagnoses?: Array<{
    type: string;
    name: string;
  }>;
}

export class GeminiAIService {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: "gemini-2.5-pro"
    });
  }

  async extractText(pdfBuffer: Buffer): Promise<string> {
    try {
      // PDFをBase64エンコード
      const base64Pdf = pdfBuffer.toString('base64');
      
      // シンプルなテキスト抽出プロンプト
      const prompt = `
以下のPDF文書の内容をすべてテキストに変換してください。
レイアウトや構造は保持し、可能な限り元の文書の形式を維持してください。
表がある場合は読みやすい形式で表現してください。

PDF文書の内容：
`;

      // Gemini APIの呼び出し
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Pdf
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      return text;
      
    } catch (error) {
      console.error("Gemini AI テキスト抽出エラー:", error);
      throw error;
    }
  }

  async processDocument(pdfBuffer: Buffer): Promise<ExtractedData> {
    try {
      // PDFをBase64エンコード
      const base64Pdf = pdfBuffer.toString('base64');
      
      // プロンプトの作成
      const prompt = `
以下のPDF文書から医療情報を抽出してください。これは診断書またはレセプト（診療報酬明細書）です。

以下の情報を正確に抽出し、JSON形式で返してください：

1. patient_name: 患者名（フルネーム）
2. hospital_name: 医療機関名
3. visit_dates: 通院日のリスト（yyyy-MM-dd形式の配列）
4. visit_days_count: 実通院日数（visit_datesの要素数）
5. inpatient_period: 入院期間（もしあれば）
   - start_date: 入院開始日（yyyy-MM-dd形式）
   - end_date: 入院終了日（yyyy-MM-dd形式）
   - days: 入院日数
6. total_cost: 治療費総額（数値のみ、円記号やカンマは除外）
7. cost_breakdown: 請求先別治療費の内訳
   - item: 項目名（例：健康保険分、本人負担分）
   - amount: 金額（数値のみ）
8. diagnoses: 傷病名のリスト
   - type: 種別（主傷病名、副傷病名など）
   - name: 傷病名

注意事項：
- 日付は必ずyyyy-MM-dd形式で返してください
- 金額は数値のみで返してください（通貨記号やカンマは含めない）
- 存在しない情報はnullとしてください
- JSONは必ず有効な形式で返してください

PDF文書の内容：
`;

      // Gemini APIの呼び出し
      const result = await this.model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: "application/pdf",
            data: base64Pdf
          }
        }
      ]);

      const response = await result.response;
      const text = response.text();
      
      // JSONの抽出と解析
      let extractedData: ExtractedData;
      try {
        // レスポンスからJSON部分を抽出
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error("JSONが見つかりませんでした");
        }
        
        extractedData = JSON.parse(jsonMatch[0]);
        
        // visit_days_countの自動計算
        if (extractedData.visit_dates && Array.isArray(extractedData.visit_dates)) {
          extractedData.visit_days_count = extractedData.visit_dates.length;
        }
        
        // 入院日数の自動計算
        if (extractedData.inpatient_period?.start_date && extractedData.inpatient_period?.end_date) {
          const start = new Date(extractedData.inpatient_period.start_date);
          const end = new Date(extractedData.inpatient_period.end_date);
          const diffTime = Math.abs(end.getTime() - start.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 入院日と退院日を含む
          extractedData.inpatient_period.days = diffDays;
        }
        
      } catch (parseError) {
        console.error("JSON解析エラー:", parseError);
        console.error("レスポンステキスト:", text);
        throw new Error("抽出結果の解析に失敗しました");
      }

      return extractedData;
      
    } catch (error) {
      console.error("Gemini AI処理エラー:", error);
      throw error;
    }
  }
}

// シングルトンインスタンスをエクスポート
let geminiAIService: GeminiAIService | null = null;

export function getGeminiAIService(): GeminiAIService {
  if (!geminiAIService) {
    geminiAIService = new GeminiAIService();
  }
  return geminiAIService;
}