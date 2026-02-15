import React, { useState } from 'react';
import { AgentProfile } from '../types';
import { governanceRules } from '../data';
import { Sparkles, Copy, RefreshCw, Terminal, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface AgentGeneratorProps {
  agent: AgentProfile;
}

export const AgentGenerator: React.FC<AgentGeneratorProps> = ({ agent }) => {
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const generateProtocol = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const selectedModel = localStorage.getItem('selected_ai_model') || 'gemini-2.5-flash';
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-AI-Model': selectedModel
        },
        body: JSON.stringify({
          agentId: agent.id,
          tenantId: 'default', // Hardcoded for MVP as per requirements
          mission: t(agent.mission as any),
          governanceRules: governanceRules, // Optional, but sending for consistency
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: Failed to generate prompt`);
      }

      setGeneratedPrompt(data.promptMarkdown || 'No se pudo generar el contenido.');
    } catch (err: any) {
      console.error("Error generating prompt:", err);
      setError(err.message || "Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl mt-12 animate-fade-in-up">
      <div className="bg-slate-950 p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 mb-1">
            <Terminal size={20} />
            <span className="font-mono text-xs font-bold uppercase tracking-widest">{t('protocolGenerator')}</span>
          </div>
          <h2 className="text-xl font-bold text-white">{t('instantiateAgent')}</h2>
          <p className="text-slate-400 text-sm">{t('generateProductionPrompt')}</p>
        </div>

        <button
          onClick={generateProtocol}
          disabled={isLoading}
          className={`
            flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold transition-all
            ${isLoading
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:transform active:scale-95'
            }
          `}
        >
          {isLoading ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              {t('generatingProtocol')}
            </>
          ) : (
            <>
              <Sparkles size={18} />
              {t('generatePrompt')}
            </>
          )}
        </button>
      </div>

      {(generatedPrompt || error) && (
        <div className="p-0 bg-[#0d1117] min-h-[200px] relative border-t border-slate-800">
          {error ? (
            <div className="p-8 text-center">
              <div className="inline-flex p-3 rounded-full bg-red-900/20 text-red-500 mb-3">
                <Terminal size={24} />
              </div>
              <p className="text-red-400 font-bold mb-1">{t('generationFailed')}</p>
              <p className="text-sm font-mono text-red-400/70">{error}</p>
            </div>
          ) : (
            <div className="relative group">
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600 shadow-xl"
                  title={t('copy')}
                >
                  {copied ? (
                    <>
                      <Check size={16} className="text-emerald-400" />
                      <span className="text-emerald-400 text-xs font-bold">{t('copied')}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span className="text-xs font-bold">{t('copy')}</span>
                    </>
                  )}
                </button>
              </div>
              <div className="p-8 overflow-x-auto">
                <pre className="font-mono text-sm text-slate-300 whitespace-pre-wrap leading-relaxed max-w-none">
                  {generatedPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
