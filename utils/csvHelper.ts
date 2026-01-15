import { AdCampaign, AnalysisSummary, Lead } from '../types';

// Helper to normalize strings for comparison (remove accents, lowercase)
const normalize = (str: string) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

// Improved number parsing to handle both 1,234.56 and 1.234,56 formats
const parseValue = (val: string): number => {
  if (!val) return 0;
  // Remove spaces and currency symbols
  let clean = val.replace(/[^0-9,.-]/g, '');
  
  const lastComma = clean.lastIndexOf(',');
  const lastDot = clean.lastIndexOf('.');
  
  // If comma appears after dot (1.234,56) or only comma exists (100,00) -> IT IS BR/EU Format
  if (lastComma > lastDot) {
    clean = clean.replace(/\./g, '').replace(',', '.');
  } else {
    // IT IS US Format (1,234.56)
    clean = clean.replace(/,/g, '');
  }
  
  return parseFloat(clean) || 0;
};

// Robust line splitter that handles delimiters inside quotes
const splitLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' && line[i+1] === '"') {
      current += '"';
      i++; // Skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(c => c.trim().replace(/^"|"$/g, '')); // Remove surrounding quotes
};

const detectDelimiter = (line: string): string => {
  const commas = (line.match(/,/g) || []).length;
  const semicolons = (line.match(/;/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas) return ';';
  return ',';
};

export const parseCSV = (csvText: string): AdCampaign[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Auto-detect delimiter from the first line
  const firstLine = lines[0];
  const delimiter = detectDelimiter(firstLine);

  const headers = splitLine(firstLine, delimiter).map(normalize);
  
  // Dynamic column mapping strategies (Added Portuguese keywords)
  const mapIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

  const idxName = mapIndex(['nome da campanha', 'campaign name', 'campaign', 'campanha']);
  const idxSpend = mapIndex(['valor usado', 'amount spent', 'spend', 'gasto', 'custo', 'valor']);
  const idxImpressions = mapIndex(['impressoes', 'impressions', 'views']);
  const idxClicks = mapIndex(['cliques', 'clicks', 'link clicks']);
  const idxResults = mapIndex(['resultados', 'results', 'leads', 'conversions', 'cadastro']);

  const data: AdCampaign[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i], delimiter);
    
    // Skip if row doesn't have enough columns
    if (values.length < 1) continue;

    // Safety checks for missing columns
    const spend = idxSpend > -1 ? parseValue(values[idxSpend]) : 0;
    const impressions = idxImpressions > -1 ? parseValue(values[idxImpressions]) : 0;
    const clicks = idxClicks > -1 ? parseValue(values[idxClicks]) : 0;
    const results = idxResults > -1 ? parseValue(values[idxResults]) : 0;
    
    // Fallback for name
    let campaignName = idxName > -1 ? values[idxName] : `Campaign ${i}`;
    if (!campaignName) campaignName = `Row ${i}`;

    // Filter out empty rows or total rows
    if (
      campaignName.toLowerCase().includes('total') || 
      campaignName.toLowerCase().includes('results') ||
      (spend === 0 && impressions === 0 && clicks === 0)
    ) continue;

    data.push({
      campaignName,
      spend,
      impressions,
      clicks,
      results
    });
  }

  return data;
};

export const parseLeadsCSV = (csvText: string): Lead[] => {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const delimiter = detectDelimiter(firstLine);
  const headers = splitLine(firstLine, delimiter).map(normalize);

  const mapIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

  // Common Meta Leads headers
  const idxId = mapIndex(['id', 'lead_id']);
  const idxDate = mapIndex(['created_time', 'data', 'date']);
  const idxName = mapIndex(['full_name', 'nome', 'name', 'nome completo']);
  const idxEmail = mapIndex(['email', 'e-mail']);
  const idxPhone = mapIndex(['phone_number', 'telefone', 'phone', 'celular']);
  const idxCampaign = mapIndex(['campaign_name', 'campanha', 'campaign']);

  const leads: Lead[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i], delimiter);
    if (values.length < 1) continue;

    // If parsing fails massively (e.g. only 1 column detected but we expect multiple), 
    // try to be safe. But if delimiter detection works, this should be fine.

    // Robust extraction: remove quotes, handle potential missing values
    const safeGet = (idx: number) => (idx > -1 && values[idx]) ? values[idx].replace(/^"|"$/g, '').trim() : '';

    leads.push({
      id: safeGet(idxId) || `lead-${i}`,
      createdTime: safeGet(idxDate) || new Date().toISOString(),
      fullName: safeGet(idxName) || 'Lead Sem Nome',
      email: safeGet(idxEmail),
      phoneNumber: safeGet(idxPhone).replace(/[^0-9]/g, ''),
      campaignName: safeGet(idxCampaign) || 'Desconhecida',
      status: 'new'
    });
  }

  return leads;
};

export const calculateMetrics = (data: AdCampaign[]): AnalysisSummary => {
  const totalSpend = data.reduce((acc, curr) => acc + curr.spend, 0);
  const totalImpressions = data.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalClicks = data.reduce((acc, curr) => acc + curr.clicks, 0);
  
  // Avoid division by zero
  const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
  const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;

  // Find best campaign (Lowest CPA)
  let bestCampaignName = "N/A";
  let bestCPA = Infinity;

  data.forEach(c => {
    if (c.results > 0) {
      const cpa = c.spend / c.results;
      if (cpa < bestCPA) {
        bestCPA = cpa;
        bestCampaignName = c.campaignName;
      }
    }
  });

  if (bestCPA === Infinity) bestCPA = 0;

  return {
    totalSpend,
    totalImpressions,
    totalClicks,
    avgCTR,
    avgCPC,
    bestCampaignName,
    bestCPA
  };
};