export interface AdCampaign {
  campaignName: string;
  spend: number;
  impressions: number;
  clicks: number;
  results: number; // Leads or Conversions
}

export interface AnalysisSummary {
  totalSpend: number;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: number;
  avgCPC: number;
  bestCampaignName: string;
  bestCPA: number; // Cost per Result
}

export interface AiActionItem {
  action: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}

export interface AiAnalysisResult {
  insights: AiInsight[];
  actionPlan: AiActionItem[];
}

export interface AiInsight {
  title: string;
  content: string;
  detailedExplanation: string;
  type: 'success' | 'warning' | 'info';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface Lead {
  id: string;
  createdTime: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  campaignName: string;
  status: 'new' | 'contacted';
}