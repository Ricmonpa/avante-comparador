export interface CompetitorInfo {
  vendor: string;
  price: number;
  title: string;
  link: string | null;
}

export interface AnalysisResult {
  sku: string;
  brand: string;
  model: string;
  size: string;
  vehicleType?: string;
  yourPrice: number;
  cost?: number;
  margin?: number;
  bestCompetitorPrice: number;
  competitorVendor: string;
  competitors: CompetitorInfo[];
  difference: number;
  differencePercent: number;
  status: 'overpriced' | 'competitive' | 'underpriced' | 'error';
  recommendation: string;
  suggestedPrice?: number;
  competitorUrl: string;
  competitorLink?: string | null;
  error?: string;
}

export interface InventoryItem {
  sku: string;
  brand: string;
  model: string;
  size: string;
  price: number;
  cost?: number;
  stock?: number;
  competitorPrice?: number;
  margin?: number;
  vehicleType?: string;
}

export interface PriceHistoryEntry {
  date: string;
  avantePrice: number;
  competitorPrice: number;
  competitorVendor: string;
  query: string;
}

export interface UploadResult {
  success: boolean;
  total: number;
  analysis: AnalysisResult[];
  analysisSuccess: boolean;
  headerRowDetected: number;
  analysisError?: string;
}
