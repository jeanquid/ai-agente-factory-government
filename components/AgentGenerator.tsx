import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { AgentProfile } from '../types';
import { governanceRules } from '../data';
import { Sparkles, Copy, RefreshCw, Terminal, Check } from 'lucide-react';

interface AgentGeneratorProps {
  agent: AgentProfile;
}

export const AgentGenerator: React.FC<AgentGeneratorProps> = ({ agent }) => {
  const [generatedPrompt, setGeneratedPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const generateProtocol = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const systemInstruction = `
        Eres el Arquitecto Principal de una 'Fábrica de Agentes de IA' de nivel empresarial.
        Tu tarea es generar el SYSTEM PROMPT (Instrucción del Sistema) técnico y riguroso para configurar un LLM como el agente especificado a continuación.
        
        REGLAS DE GENERACIÓN:
        1. Idioma: Español.
        2. Tono: Autoritario, Profesional, Estricto.
        3. Formato: Markdown limpio y estructurado.
        4. El prompt resultante debe hablarle al agente en segunda persona ("Tú eres...").
        5. Debes incorporar explícitamente las reglas de gobierno global como restricciones duras.
        
        ESTRUCTURA DEL SYSTEM PROMPT A GENERAR:
        ### IDENTITY
        [Definición clara del rol y la misión]
        
        ### STRICT BOUNDARIES (CRITICAL)
        [Lista de lo que NO debe hacer, basado en 'Out of Scope' y reglas de gobierno]
        
        ### CORE CAPABILITIES & TOOLS
        [Qué puede hacer y qué entradas espera]
        
        ### OPERATIONAL PROTOCOL
        [Procedimiento paso a paso para ejecutar sus tareas]
        
        ### QUALITY GATE & SELF-CORRECTION
        [Checklist que debe verificar internamente antes de responder]
        
        ### OUTPUT FORMATTING
        [Estructura exacta de los entregables]
        
        ---
        
        DATOS DEL AGENTE:
        ${JSON.stringify(agent, null, 2)}
        
        REGLAS DE GOBIERNO GLOBAL:
        ${JSON.stringify(governanceRules, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-latest',
        contents: systemInstruction,
      });

      const text = response.text;
      setGeneratedPrompt(text || 'No se pudo generar el contenido.');
    } catch (err: any) {
      console.error("Error generating prompt:", err);
      setError(err.message || "Error al conectar con la API de Gemini. Verifique su API Key.");
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
             <span className="font-mono text-xs font-bold uppercase tracking-widest">Protocol Generator</span>
           </div>
           <h2 className="text-xl font-bold text-white">Instantiate Agent Core</h2>
           <p className="text-slate-400 text-sm">Generate the production System Prompt using the Governance Engine (Gemini 2.5).</p>
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
              Generating Protocol...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Generate System Prompt
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
               <p className="text-red-400 font-bold mb-1">Generation Failed</p>
               <p className="text-sm font-mono text-red-400/70">{error}</p>
             </div>
          ) : (
            <div className="relative group">
               <div className="absolute top-4 right-4 z-10">
                 <button
                   onClick={copyToClipboard}
                   className="flex items-center gap-2 px-3 py-2 bg-slate-800/90 hover:bg-slate-700 text-slate-300 rounded-lg backdrop-blur-sm transition-all border border-slate-600 shadow-xl"
                   title="Copy to clipboard"
                 >
                   {copied ? (
                     <>
                        <Check size={16} className="text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-bold">Copied</span>
                     </>
                   ) : (
                     <>
                        <Copy size={16} />
                        <span className="text-xs font-bold">Copy</span>
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
