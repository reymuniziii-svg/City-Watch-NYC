import { callEdgeFunction, isSupabaseConfigured } from './supabaseClient';

export interface BillClassification {
  billId: string;
  introNumber: string;
  title: string;
  classification: 'Opportunity' | 'Threat' | 'Conflict' | 'Neutral';
  reasoning: string;
  confidence: number;
}

export interface ImpactReport {
  id: string;
  user_id: string;
  platform_id: string;
  status: 'pending' | 'processing' | 'complete' | 'error';
  report_json: { results: BillClassification[] } | null;
  error_message: string | null;
  created_at: string;
}

export async function runAnalysis(
  token: string,
  platformId: string
): Promise<{ reportId: string; billsAnalyzed: number }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  return await callEdgeFunction<{ reportId: string; billsAnalyzed: number }>(
    'analyze-impact',
    { method: 'POST', token, body: { platformId } }
  );
}

export async function getReports(token: string): Promise<ImpactReport[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    return await callEdgeFunction<ImpactReport[]>('analyze-impact', {
      method: 'GET',
      token,
    });
  } catch (err) {
    console.error('Error fetching impact reports:', err);
    return [];
  }
}

export async function generatePDF(
  token: string,
  reportId: string
): Promise<{ url: string }> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  return await callEdgeFunction<{ url: string }>('generate-impact-pdf', {
    method: 'POST',
    token,
    body: { reportId },
  });
}
