import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { AdCampaign } from './types';
import { parseCSV } from './utils/csvHelper';
import { BarChart3 } from 'lucide-react';

const App: React.FC = () => {
  const [data, setData] = useState<AdCampaign[] | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileProcessed = (csvText: string) => {
    try {
      setUploadError(null);
      const parsedData = parseCSV(csvText);
      
      if (parsedData.length > 0) {
        setData(parsedData);
      } else {
        setUploadError(
          "Nenhum dado válido encontrado. Certifique-se de que seu CSV possui cabeçalhos como 'Nome da Campanha', 'Valor usado', 'Impressões' e tente novamente."
        );
      }
    } catch (e) {
      setUploadError("Erro inesperado ao processar o arquivo. Verifique se o CSV não está corrompido.");
      console.error(e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">
            Cientista de Dados Meta Ads
          </span>
        </div>
      </nav>

      {/* Content */}
      <main className="pb-20">
        {!data ? (
          <FileUpload 
            onFileProcessed={handleFileProcessed} 
            errorMessage={uploadError} 
          />
        ) : (
          <Dashboard data={data} onReset={() => { setData(null); setUploadError(null); }} />
        )}
      </main>
    </div>
  );
};

export default App;