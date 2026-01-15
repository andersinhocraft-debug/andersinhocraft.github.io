import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onFileProcessed: (text: string) => void;
  errorMessage?: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileProcessed, errorMessage }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setLocalError(null);
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setLocalError("Por favor, envie um arquivo CSV válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) onFileProcessed(text);
    };
    reader.onerror = () => setLocalError("Falha ao ler o arquivo.");
    reader.readAsText(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  // Combine local validation errors with processing errors from parent
  const displayError = localError || errorMessage;

  return (
    <div className="w-full max-w-2xl mx-auto mt-10">
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 bg-white'}
          ${displayError ? 'border-red-300 bg-red-50' : ''}
        `}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className={`p-4 rounded-full mb-4 ${displayError ? 'bg-red-100' : 'bg-slate-100'}`}>
          {displayError ? (
             <AlertCircle className="w-8 h-8 text-red-600" />
          ) : (
             <Upload className="w-8 h-8 text-slate-600" />
          )}
        </div>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Upload CSV Meta Ads</h3>
        <p className="text-slate-500 text-center max-w-sm mb-6">
          Arraste e solte seu arquivo 'dados_meta_ads.csv' aqui. 
          <br/>
          <span className="text-xs opacity-75">Suporta separadores vírgula (,) e ponto e vírgula (;).</span>
        </p>
        <button className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
          Selecionar Arquivo
        </button>
        <input 
          type="file" 
          ref={inputRef} 
          className="hidden" 
          accept=".csv"
          onChange={handleChange}
        />
      </div>

      {displayError && (
        <div className="mt-4 p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <span className="font-semibold block mb-1">Erro no Upload</span>
            {displayError}
          </div>
        </div>
      )}

      <div className="mt-8 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h4 className="font-semibold text-slate-800 mb-2 flex items-center gap-2">
          <FileText className="w-4 h-4 text-slate-500" />
          Formatos Aceitos
        </h4>
        <p className="text-sm text-slate-600 mb-2">
          O app aceita exportações padrão do Meta Ads. Ele busca automaticamente por colunas como:
        </p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-700 font-mono">
          <span className="bg-slate-100 px-2 py-1 rounded">Nome da campanha</span>
          <span className="bg-slate-100 px-2 py-1 rounded">Valor usado (Spend)</span>
          <span className="bg-slate-100 px-2 py-1 rounded">Impressões</span>
          <span className="bg-slate-100 px-2 py-1 rounded">Cliques</span>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;