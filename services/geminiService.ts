import { GoogleGenAI, Type, Chat } from "@google/genai";
import { AdCampaign, AnalysisSummary, AiAnalysisResult } from "../types";

const prepareDataContext = (summary: AnalysisSummary, campaigns: AdCampaign[]): string => {
  // Select top 20 campaigns by spend
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 20);

  const campaignListStr = topCampaigns
    .map(c => `- ${c.campaignName}: Gasto R$${c.spend.toFixed(2)}, Leads: ${c.results}, CPA R$${c.results > 0 ? (c.spend/c.results).toFixed(2) : 'N/A'}, CTR ${((c.clicks/c.impressions)*100).toFixed(2)}%`)
    .join('\n');

  return `
    DADOS DO DASHBOARD ATUAL:
    - Gasto Total: R$${summary.totalSpend.toFixed(2)}
    - CPA Médio: R$${summary.bestCPA > 0 ? (summary.totalSpend / (campaigns.reduce((acc, c) => acc + c.results, 0) || 1)).toFixed(2) : 'N/A'}
    - CTR Médio: ${summary.avgCTR.toFixed(2)}%
    - Melhor Campanha (CPA): ${summary.bestCampaignName}

    DETALHE DAS PRINCIPAIS CAMPANHAS:
    ${campaignListStr}
  `;
};

export const generateMarketingInsights = async (
  summary: AnalysisSummary,
  campaigns: AdCampaign[]
): Promise<AiAnalysisResult> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dataContext = prepareDataContext(summary, campaigns);

    const prompt = `
      Atue como um Especialista Sênior em Tráfego Pago e Data Science.
      Analise os dados abaixo e forneça uma análise estratégica.
      
      ${dataContext}

      TAREFA:
      Retorne um JSON com dois arrays: 'insights' e 'actionPlan'.

      1. 'insights': 3 observações críticas sobre padrões detectados.
         - 'content': Resumo curto e direto (1 frase).
         - 'detailedExplanation': Uma explicação técnica aprofundada de por que isso está acontecendo e um exemplo prático ou benchmark de mercado relacionado a esse cenário. (2-3 frases).
      
      2. 'actionPlan': 3 a 4 ações práticas e diretas para o gestor de tráfego executar AGORA.
         - Exemplo: "Pausar campanha X pois CPA está 3x acima da média", "Escalar campanha Y em 20%", "Revisar criativos da campanha Z".
         - Prioridade deve ser: 'high', 'medium', ou 'low'.

      O tom deve ser profissional, direto e focado em ROI (Retorno sobre Investimento).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  detailedExplanation: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ["success", "warning", "info"] }
                },
                required: ["title", "content", "detailedExplanation", "type"]
              }
            },
            actionPlan: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  action: { type: Type.STRING, description: "Ação direta, ex: Pausar Campanha X" },
                  reason: { type: Type.STRING, description: "Porquê fazer isso" },
                  priority: { type: Type.STRING, enum: ["high", "medium", "low"] }
                },
                required: ["action", "reason", "priority"]
              }
            }
          },
          required: ["insights", "actionPlan"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response");
    
    return JSON.parse(text) as AiAnalysisResult;

  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      insights: [
        {
          title: "Erro na Análise IA",
          content: "Não foi possível gerar recomendações avançadas. Verifique a chave de API.",
          detailedExplanation: "Ocorreu um erro de comunicação com a API do Gemini. Verifique se sua chave está válida e se há cota disponível.",
          type: "warning"
        }
      ],
      actionPlan: []
    };
  }
};

export const createMarketingChat = (
  summary: AnalysisSummary,
  campaigns: AdCampaign[]
): Chat => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const dataContext = prepareDataContext(summary, campaigns);

  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `
        Você é um Assistente de Data Science especializado em Meta Ads (Facebook/Instagram Ads).
        Você tem acesso aos dados da conta do usuário listados abaixo.
        
        ${dataContext}

        Seu objetivo é responder perguntas do usuário sobre a performance, sugerir otimizações e explicar métricas.
        Seja conciso, use formatação Markdown para deixar a resposta legível (negrito para números importantes).
        Se o usuário perguntar sobre uma campanha que não está na lista dos "TOP", explique que você só tem visão das principais, mas pode dar dicas gerais.
        Responda sempre em Português do Brasil.
      `,
    }
  });
};

export const generateSalesScript = async (campaignName: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Escreva uma mensagem de WhatsApp curta, casual e persuasiva para um lead que acabou de se cadastrar através da campanha chamada "${campaignName}".
      
      A mensagem deve:
      1. Parecer escrita por um humano (sem linguagem robótica ou corporativa demais).
      2. Perguntar algo para iniciar a conversa (não apenas jogar informações).
      3. Ter emojis moderados.
      4. O texto deve ser plano, sem formatação markdown, pronto para ser copiado.
      5. Máximo de 3 linhas.
    `
  });

  return response.text || "Olá! Vi que você se cadastrou em nosso anúncio. Como posso ajudar você hoje?";
};