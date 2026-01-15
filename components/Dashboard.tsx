import React, { useEffect, useState, useRef } from 'react';
import { AdCampaign, AnalysisSummary, AiAnalysisResult, ChatMessage, Lead } from '../types';
import { calculateMetrics, parseLeadsCSV } from '../utils/csvHelper';
import { generateMarketingInsights, createMarketingChat, generateSalesScript } from '../services/geminiService';
import { Chat, GenerateContentResponse } from "@google/genai";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, LabelList
} from 'recharts';
import { 
  TrendingUp, DollarSign, MousePointer, Eye, Trophy, Sparkles, Loader2, 
  RefreshCcw, Target, AlertTriangle, ArrowRight, ListFilter, ChevronDown, ChevronUp, 
  Lightbulb, MessageSquare, Send, Bot, User, Users, MessageCircle, Upload, CheckCircle,
  Mail, Phone, Calendar, Tag
} from 'lucide-react';

interface DashboardProps {
  data: AdCampaign[];
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  // Tabs: 'dashboard' (Default) | 'leads' (CRM)
  const [mainTab, setMainTab] = useState<'dashboard' | 'leads'>('dashboard');

  const [metrics, setMetrics] = useState<AnalysisSummary | null>(null);
  const [aiResult, setAiResult] = useState<AiAnalysisResult | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [expandedInsightIndex, setExpandedInsightIndex] = useState<number | null>(null);
  
  // Chat State
  const [activeTab, setActiveTab] = useState<'insights' | 'chat'>('insights');
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Leads CRM State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [salesScript, setSalesScript] = useState<string>('');
  const [loadingScript, setLoadingScript] = useState(false);
  const leadsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const summary = calculateMetrics(data);
    setMetrics(summary);

    // Initialize Insights
    const fetchInsights = async () => {
      setLoadingAi(true);
      const result = await generateMarketingInsights(summary, data);
      setAiResult(result);
      setLoadingAi(false);
      
      // Auto-generate a generic script based on best campaign
      if (summary.bestCampaignName) {
         setLoadingScript(true);
         const script = await generateSalesScript(summary.bestCampaignName);
         setSalesScript(script);
         setLoadingScript(false);
      }
    };

    // Initialize Chat
    const chat = createMarketingChat(summary, data);
    setChatSession(chat);
    setMessages([{ role: 'model', text: 'Olá! Analisei seus dados. Quer saber mais sobre alguma campanha específica ou precisa de ajuda com o ROI?' }]);

    fetchInsights();
  }, [data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !chatSession) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsChatLoading(true);

    try {
      const result = await chatSession.sendMessageStream({ message: userMsg });
      
      let fullText = '';
      setMessages(prev => [...prev, { role: 'model', text: '' }]); // Placeholder

      for await (const chunk of result) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          setMessages(prev => {
            const newHistory = [...prev];
            newHistory[newHistory.length - 1].text = fullText;
            return newHistory;
          });
        }
      }
    } catch (error) {
      console.error("Chat Error", error);
      setMessages(prev => [...prev, { role: 'model', text: 'Desculpe, tive um problema ao processar sua mensagem. Tente novamente.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleLeadsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) {
          const parsedLeads = parseLeadsCSV(text);
          setLeads(parsedLeads);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleWhatsAppClick = (lead: Lead) => {
    // Basic phone cleaning for Brazil/Intl format assumption
    // If number doesn't have country code, usually assumes 55 for BR app context or raw
    let phone = lead.phoneNumber.replace(/[^0-9]/g, '');
    if (phone.length <= 11 && !phone.startsWith('55')) {
       phone = '55' + phone; 
    }
    
    // Personalize message
    const personalizedMessage = salesScript.replace('[Nome]', lead.fullName.split(' ')[0]);
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(personalizedMessage)}`;
    
    // Mark as contacted (visually)
    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: 'contacted' } : l));
    
    window.open(url, '_blank');
  };

  const handleRefreshScript = async () => {
     setLoadingScript(true);
     const script = await generateSalesScript(metrics?.bestCampaignName || "Geral");
     setSalesScript(script);
     setLoadingScript(false);
  }

  if (!metrics) return <div>Processando dados...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Top Header with Tab Switcher */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Análise de Campanhas</h1>
          <p className="text-slate-500">
            {mainTab === 'dashboard' ? 'Visão estratégica e insights de IA' : 'Gestão e disparo de mensagens para Leads'}
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setMainTab('dashboard')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mainTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <BarChart className="w-4 h-4" />
             Dashboard
           </button>
           <button 
             onClick={() => setMainTab('leads')}
             className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mainTab === 'leads' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Users className="w-4 h-4" />
             Gestão de Leads
           </button>
        </div>
        <button 
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          Novo Arquivo
        </button>
      </div>

      {mainTab === 'dashboard' ? (
        <>
          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in">
            <MetricCard 
              title="Investimento Total" 
              value={`R$ ${metrics.totalSpend.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              icon={<DollarSign className="w-5 h-5 text-green-600" />} 
              color="bg-green-50"
            />
            <MetricCard 
              title="CTR Médio" 
              value={`${metrics.avgCTR.toFixed(2)}%`} 
              subtitle="Atratividade dos Anúncios"
              icon={<MousePointer className="w-5 h-5 text-blue-600" />} 
              color="bg-blue-50"
            />
             <MetricCard 
              title="Volume de Impressões" 
              value={metrics.totalImpressions.toLocaleString('pt-BR')} 
              icon={<Eye className="w-5 h-5 text-purple-600" />} 
              color="bg-purple-50"
            />
            <MetricCard 
              title="Melhor CPA (Custo/Res)" 
              value={`R$ ${metrics.bestCPA.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
              subtitle={metrics.bestCampaignName}
              icon={<Trophy className="w-5 h-5 text-amber-600" />} 
              color="bg-amber-50"
            />
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in slide-in-from-bottom-2 fade-in">
            
            {/* Spend Chart */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-500" />
                Top Gastos por Campanha
              </h2>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sort((a,b) => b.spend - a.spend).slice(0, 8)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tickFormatter={(value) => `R$${value}`} hide />
                    <YAxis dataKey="campaignName" type="category" width={100} tick={{fontSize: 11}} />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Gasto']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    />
                    <Bar dataKey="spend" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.campaignName === metrics.bestCampaignName ? '#f59e0b' : '#3b82f6'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Efficiency Matrix */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                <Target className="w-5 h-5 text-slate-500" />
                Matriz de Eficiência
              </h2>
              <p className="text-sm text-slate-500 mb-6">Investimento (Eixo X) vs. Resultados/Leads (Eixo Y)</p>
              
              <div className="h-[350px] w-full relative">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" dataKey="spend" name="Gasto" unit="R$" tick={{fontSize: 12}} />
                    <YAxis type="number" dataKey="results" name="Resultados" unit="" tick={{fontSize: 12}} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-xs">
                            <p className="font-bold mb-1">{d.campaignName}</p>
                            <p>Gasto: R$ {d.spend.toFixed(2)}</p>
                            <p>Resultados: {d.results}</p>
                            <p className="text-blue-600 font-semibold mt-1">CPA: R$ {(d.spend/(d.results || 1)).toFixed(2)}</p>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Scatter name="Campanhas" data={data} fill="#8884d8">
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.results > 10 ? '#10b981' : entry.spend > 1000 && entry.results < 5 ? '#ef4444' : '#6366f1'} />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
                
                <div className="absolute top-0 right-0 text-[10px] text-slate-400 bg-white/90 p-2 rounded border border-slate-100">
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Alta Performance</div>
                  <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Alto Gasto / Baixo Retorno</div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Strategy Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4 fade-in">
            {/* Insights/Chat Column */}
            <div className="lg:col-span-1 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 shadow-sm flex flex-col h-[600px] overflow-hidden">
              
              {/* Tabs */}
              <div className="flex border-b border-indigo-100 bg-white/50 backdrop-blur-sm">
                <button 
                  onClick={() => setActiveTab('insights')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'insights' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Sparkles className="w-4 h-4" />
                  Insights
                </button>
                <button 
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  Chat Especialista
                </button>
              </div>
              
              {/* Content Area */}
              <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-indigo-200">
                {activeTab === 'insights' ? (
                  // INSIGHTS VIEW
                  loadingAi ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-75">
                      <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
                      <p className="text-sm">Processando inteligência...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {aiResult?.insights.map((insight, idx) => {
                        const isExpanded = expandedInsightIndex === idx;
                        return (
                          <div 
                            key={idx} 
                            onClick={() => setExpandedInsightIndex(isExpanded ? null : idx)}
                            className={`
                              rounded-lg border transition-all duration-200 cursor-pointer overflow-hidden
                              ${isExpanded ? 'bg-white ring-2 ring-indigo-500/20 border-indigo-200 shadow-md' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}
                            `}
                          >
                            <div className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 font-semibold text-slate-700 text-sm">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    insight.type === 'success' ? 'bg-green-500' : 
                                    insight.type === 'warning' ? 'bg-amber-500' : 'bg-blue-400'
                                  }`}></span>
                                  <span className="leading-tight">{insight.title}</span>
                                </div>
                                {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                              </div>
                              
                              <p className={`mt-2 text-sm text-slate-600 leading-relaxed ${!isExpanded && 'line-clamp-2'}`}>
                                {insight.content}
                              </p>
                            </div>

                            {isExpanded && (
                              <div className="px-4 pb-4 pt-0 animate-in slide-in-from-top-2 fade-in duration-200">
                                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                                    <div className="flex items-start gap-2 mb-1">
                                      <Lightbulb className="w-3.5 h-3.5 text-indigo-600 mt-0.5" />
                                      <span className="text-xs font-bold text-indigo-700 uppercase tracking-wide">Análise Técnica</span>
                                    </div>
                                    <p className="text-sm text-slate-700 leading-relaxed">
                                      {insight.detailedExplanation}
                                    </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  // CHAT VIEW
                  <div className="flex flex-col h-full">
                    <div className="flex-1 space-y-4 pb-2">
                      {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-emerald-600'}`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                          </div>
                          <div className={`
                            max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'user' 
                              ? 'bg-indigo-600 text-white rounded-tr-none' 
                              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'}
                          `}>
                             <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="flex gap-3">
                           <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
                              <Bot className="w-4 h-4 text-white" />
                           </div>
                           <div className="bg-white border border-slate-200 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                           </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Area (Only visible in Chat Tab) */}
              {activeTab === 'chat' && (
                <div className="p-3 bg-white border-t border-indigo-100">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Pergunte sobre seus resultados..."
                      className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    />
                    <button 
                      onClick={handleSendMessage}
                      disabled={!inputMessage.trim() || isChatLoading}
                      className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Action Plan Column */}
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[600px] overflow-y-auto">
              <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-600" />
                Plano de Ação Recomendado
              </h2>
              
              {loadingAi ? (
                <div className="h-40 bg-slate-50 rounded-lg animate-pulse"></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {aiResult?.actionPlan.map((item, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-white
                        ${item.priority === 'high' ? 'bg-red-500 shadow-red-200' : 
                          item.priority === 'medium' ? 'bg-amber-500 shadow-amber-200' : 'bg-blue-500'}
                        shadow-lg
                      `}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 mb-1">{item.action}</h3>
                        <p className="text-sm text-slate-600">{item.reason}</p>
                        <span className={`inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                           item.priority === 'high' ? 'bg-red-100 text-red-700' : 
                           item.priority === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          Prioridade {item.priority === 'high' ? 'Alta' : item.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {!aiResult && <p className="text-slate-400">Nenhum plano gerado.</p>}
                </div>
              )}
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <ListFilter className="w-5 h-5 text-slate-500" />
                Dados Detalhados
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Nome da Campanha</th>
                    <th className="px-6 py-4 text-right">Gasto</th>
                    <th className="px-6 py-4 text-right">Impressões</th>
                    <th className="px-6 py-4 text-right">Cliques</th>
                    <th className="px-6 py-4 text-right">CTR</th>
                    <th className="px-6 py-4 text-right">Resultados</th>
                    <th className="px-6 py-4 text-right">CPA (Custo/Res)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.sort((a,b) => b.spend - a.spend).map((campaign, idx) => {
                    const cpa = campaign.results > 0 ? campaign.spend / campaign.results : 0;
                    const ctr = campaign.impressions > 0 ? (campaign.clicks / campaign.impressions) * 100 : 0;
                    
                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-900 truncate max-w-[200px]" title={campaign.campaignName}>
                          {campaign.campaignName}
                        </td>
                        <td className="px-6 py-3 text-right">R$ {campaign.spend.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</td>
                        <td className="px-6 py-3 text-right">{campaign.impressions.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-3 text-right">{campaign.clicks.toLocaleString('pt-BR')}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`px-2 py-1 rounded ${ctr > 1.5 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                            {ctr.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-semibold">{campaign.results}</td>
                        <td className="px-6 py-3 text-right">
                           {campaign.results > 0 ? (
                             <span className={cpa < metrics.bestCPA * 1.5 ? 'text-green-600 font-medium' : 'text-slate-600'}>
                               R$ {cpa.toFixed(2)}
                             </span>
                           ) : <span className="text-slate-300">-</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-2">
           {/* LEADS CRM VIEW */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left: Message Generator */}
              <div className="lg:col-span-1 space-y-4">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-6">
                    <div className="flex items-center justify-between mb-4">
                       <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                          <MessageCircle className="w-5 h-5 text-emerald-600" />
                          Script de Vendas IA
                       </h2>
                       <button onClick={handleRefreshScript} className="p-1 hover:bg-slate-100 rounded text-slate-500">
                          <RefreshCcw className="w-4 h-4" />
                       </button>
                    </div>
                    
                    <p className="text-sm text-slate-500 mb-4">
                       Abaixo, uma mensagem personalizada para maximizar a conversão deste perfil de leads.
                    </p>

                    {loadingScript ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                      </div>
                    ) : (
                      <textarea 
                        className="w-full h-40 p-4 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                        value={salesScript}
                        onChange={(e) => setSalesScript(e.target.value)}
                      />
                    )}
                    <div className="mt-2 text-xs text-slate-400">
                       * [Nome] será substituído automaticamente.
                    </div>
                 </div>

                 <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl">
                    <h3 className="font-semibold text-indigo-800 mb-2">Como funciona?</h3>
                    <ul className="text-sm text-indigo-700 space-y-2">
                       <li>1. Faça o upload do arquivo CSV de leads exportado do Meta.</li>
                       <li>2. A IA gera um script ideal baseado na campanha.</li>
                       <li>3. Clique no botão de WhatsApp para abrir a conversa já preenchida.</li>
                    </ul>
                 </div>
              </div>

              {/* Right: Leads List */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[700px]">
                 {leads.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
                       <div className="bg-slate-100 p-4 rounded-full mb-4">
                          <Upload className="w-8 h-8 text-slate-400" />
                       </div>
                       <h3 className="text-lg font-semibold text-slate-700 mb-2">Importar Leads</h3>
                       <p className="text-slate-500 max-w-sm mb-6">Carregue o CSV exportado do Gerenciador de Anúncios para começar a prospectar.</p>
                       <button 
                         onClick={() => leadsInputRef.current?.click()}
                         className="px-6 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                       >
                          Carregar CSV de Leads
                       </button>
                       <input 
                         type="file" 
                         ref={leadsInputRef} 
                         className="hidden" 
                         accept=".csv"
                         onChange={handleLeadsUpload}
                       />
                    </div>
                 ) : (
                    <div className="flex flex-col h-full">
                       <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                          <h3 className="font-semibold text-slate-700">{leads.length} Leads Importados</h3>
                          <button 
                             onClick={() => setLeads([])}
                             className="text-xs text-red-500 hover:text-red-700"
                          >
                             Limpar Lista
                          </button>
                       </div>
                       <div className="flex-1 overflow-auto bg-slate-50 p-4">
                          <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                             <thead className="text-slate-500 font-medium">
                                <tr>
                                   <th className="px-4 py-2 font-semibold">Lead</th>
                                   <th className="px-4 py-2 font-semibold">Contato</th>
                                   <th className="px-4 py-2 font-semibold hidden md:table-cell">Campanha</th>
                                   <th className="px-4 py-2 font-semibold">Data</th>
                                   <th className="px-4 py-2 text-right">Ação</th>
                                </tr>
                             </thead>
                             <tbody>
                                {leads.map((lead, idx) => (
                                   <tr key={idx} className={`bg-white hover:bg-indigo-50/20 shadow-sm rounded-lg transition-all group ${lead.status === 'contacted' ? 'opacity-70' : ''}`}>
                                      {/* Name & Avatar */}
                                      <td className="px-4 py-3 border-y border-l rounded-l-lg border-slate-200 bg-white group-hover:bg-indigo-50/20">
                                         <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs shrink-0 shadow-sm border border-emerald-200">
                                               {lead.fullName && lead.fullName.length > 0 ? lead.fullName.substring(0,2).toUpperCase() : '?'}
                                            </div>
                                            <div className="flex flex-col max-w-[180px]">
                                               <span className="font-semibold text-slate-800 truncate" title={lead.fullName}>
                                                  {lead.fullName}
                                               </span>
                                               <span className="text-xs text-slate-400 truncate font-mono">ID: {lead.id.substring(0, 8)}</span>
                                            </div>
                                         </div>
                                      </td>
                                      
                                      {/* Contact */}
                                      <td className="px-4 py-3 border-y border-slate-200 bg-white group-hover:bg-indigo-50/20">
                                         <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                               <Mail className="w-3 h-3 text-slate-400" />
                                               <span className="truncate max-w-[150px] text-xs" title={lead.email}>{lead.email || 'Sem e-mail'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-slate-600">
                                               <Phone className="w-3 h-3 text-slate-400" />
                                               <span className="font-mono text-xs text-slate-500">{lead.phoneNumber || 'Sem telefone'}</span>
                                            </div>
                                         </div>
                                      </td>

                                      {/* Campaign */}
                                      <td className="px-4 py-3 border-y border-slate-200 bg-white group-hover:bg-indigo-50/20 hidden md:table-cell">
                                         <div className="flex items-center gap-1.5">
                                            <Tag className="w-3 h-3 text-blue-400" />
                                            <span className="inline-block text-xs font-medium text-blue-700 truncate max-w-[140px] bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                               {lead.campaignName}
                                            </span>
                                         </div>
                                      </td>

                                      {/* Date */}
                                      <td className="px-4 py-3 border-y border-slate-200 bg-white group-hover:bg-indigo-50/20 text-slate-500 text-xs">
                                         <div className="flex flex-col">
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                               <Calendar className="w-3 h-3 text-slate-400" />
                                               {new Date(lead.createdTime).toLocaleDateString('pt-BR')}
                                            </div>
                                            <span className="text-[10px] pl-4.5 text-slate-400">{new Date(lead.createdTime).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                                         </div>
                                      </td>

                                      {/* Action */}
                                      <td className="px-4 py-3 border-y border-r rounded-r-lg border-slate-200 bg-white group-hover:bg-indigo-50/20 text-right">
                                         <button 
                                            onClick={() => handleWhatsAppClick(lead)}
                                            className={`
                                               inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors shadow-sm
                                               ${lead.status === 'contacted' 
                                                  ? 'bg-slate-100 text-slate-500 cursor-default border border-slate-200' 
                                                  : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200 border border-emerald-600'}
                                            `}
                                         >
                                            {lead.status === 'contacted' ? (
                                               <>
                                                  <CheckCircle className="w-3 h-3" />
                                                  Enviado
                                               </>
                                            ) : (
                                               <>
                                                  <MessageCircle className="w-3 h-3" />
                                                  WhatsApp
                                               </>
                                            )}
                                         </button>
                                      </td>
                                   </tr>
                                ))}
                             </tbody>
                          </table>
                       </div>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const MetricCard: React.FC<{ title: string; value: string; subtitle?: string; icon: React.ReactNode; color: string }> = ({ 
  title, value, subtitle, icon, color 
}) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1 truncate max-w-[150px]" title={subtitle}>{subtitle}</p>}
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      {icon}
    </div>
  </div>
);

export default Dashboard;