import React, { useState, useEffect } from 'react';
import { Zap, DollarSign, Check, AlertCircle } from 'lucide-react';

const AVAILABLE_MODELS = [
    {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        provider: 'google',
        speed: 3,
        cost: 1,
        description: 'Rápido y económico (Recomendado)',
        recommended: true
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        speed: 2,
        cost: 3,
        description: 'Más potente para tareas complejas'
    },
    {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash 8B',
        provider: 'google',
        speed: 3,
        cost: 1,
        description: 'Ultra rápido, ideal para alta demanda'
    },
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash (Experimental)',
        provider: 'google',
        speed: 3,
        cost: 2,
        description: 'Nueva generación - puede tener límites menores'
    },
    {
        id: 'gemini-pro',
        name: 'Gemini Pro (Alias)',
        provider: 'google',
        speed: 2,
        cost: 2,
        description: 'Alias que apunta al modelo Pro más reciente'
    }
];

export function ModelSelector({ compact = false }: { compact?: boolean }) {
    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        // Cargar modelo guardado
        const saved = localStorage.getItem('selected_ai_model');
        if (saved) setSelectedModel(saved);
    }, []);

    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
        localStorage.setItem('selected_ai_model', modelId);
        setTestStatus('idle');
        setErrorMessage('');
        setIsMenuOpen(false);
    };

    const testConnection = async () => {
        setTestStatus('testing');
        try {
            const response = await fetch('/api/test-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: selectedModel })
            });

            const data = await response.json();

            if (response.ok && data.ok) {
                setTestStatus('success');
                setTimeout(() => setTestStatus('idle'), 3000);
            } else {
                setErrorMessage(data.message || 'Error al conectar');
                setTestStatus('error');
            }
        } catch (error) {
            setErrorMessage('Error de red');
            setTestStatus('error');
        }
    };

    const currentModel = AVAILABLE_MODELS.find(m => m.id === selectedModel) || AVAILABLE_MODELS[0];

    if (compact) {
        return (
            <div className="relative group">
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="w-full bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 rounded-lg p-2.5 transition-all text-left flex items-center justify-between group"
                >
                    <div className="flex items-center gap-2 min-w-0">
                        <Zap size={14} className={testStatus === 'success' ? 'text-emerald-400' : 'text-indigo-400'} />
                        <span className="text-xs font-semibold text-slate-300 truncate">{currentModel.name}</span>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${testStatus === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'} animate-pulse`} />
                </button>

                {isMenuOpen && (
                    <>
                        <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)} />
                        <div className="absolute bottom-full mb-2 left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-20 overflow-hidden animate-slide-up">
                            <div className="p-2 border-b border-slate-800 bg-slate-950/50 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                Seleccionar Cerebro IA
                            </div>
                            <div className="max-h-48 overflow-y-auto custom-scrollbar">
                                {AVAILABLE_MODELS.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => handleModelChange(model.id)}
                                        className={`w-full text-left px-3 py-2 text-xs transition-colors hover:bg-slate-800 flex items-center justify-between ${selectedModel === model.id ? 'text-indigo-400 bg-indigo-500/5' : 'text-slate-400'}`}
                                    >
                                        <span className="truncate">{model.name}</span>
                                        {selectedModel === model.id && <Check size={12} />}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); testConnection(); }}
                                className="w-full p-2 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 text-[10px] font-bold uppercase transition-colors border-t border-slate-800"
                            >
                                {testStatus === 'testing' ? '...' : 'Probar'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-sm">
            <h3 className="text-white font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Zap size={16} className="text-indigo-400" /> Modelo de IA
            </h3>

            <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {AVAILABLE_MODELS.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => handleModelChange(model.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 border ${selectedModel === model.id
                            ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10'
                            : 'bg-slate-800/40 border-transparent hover:border-slate-700 hover:bg-slate-800/60'
                            }`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    {selectedModel === model.id ? (
                                        <div className="w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center shrink-0">
                                            <Check size={10} className="text-white" />
                                        </div>
                                    ) : (
                                        <div className="w-4 h-4 rounded-full border border-slate-600 shrink-0" />
                                    )}
                                    <span className={`font-semibold truncate ${selectedModel === model.id ? 'text-white' : 'text-slate-200'}`}>
                                        {model.name}
                                    </span>
                                    {model.recommended && (
                                        <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 uppercase font-bold shrink-0">
                                            Top
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 line-clamp-1">{model.description}</p>
                            </div>

                            <div className="flex gap-1 ml-3 shrink-0">
                                <div className="flex items-center" title="Velocidad">
                                    {[...Array(3)].map((_, i) => (
                                        <Zap
                                            key={i}
                                            size={10}
                                            fill={i < model.speed ? "currentColor" : "none"}
                                            className={i < model.speed ? "text-yellow-500" : "text-slate-700"}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center" title="Costo">
                                    {[...Array(4)].map((_, i) => (
                                        <DollarSign
                                            key={i}
                                            size={10}
                                            className={i < model.cost ? "text-emerald-500" : "text-slate-700"}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            <div className="flex flex-col gap-3 pt-3 border-t border-slate-800">
                <button
                    onClick={testConnection}
                    disabled={testStatus === 'testing'}
                    className={`
            w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all
            ${testStatus === 'testing'
                            ? 'bg-slate-800 text-slate-500'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'}
          `}
                >
                    {testStatus === 'testing' ? 'Verificando...' : 'Probar Conexión'}
                </button>

                {testStatus === 'success' && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs p-2 rounded flex items-center gap-2 animate-fade-in">
                        <Check size={14} /> Conexión Exitosa
                    </div>
                )}

                {testStatus === 'error' && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs p-2 rounded flex items-center gap-2 animate-fade-in">
                        <AlertCircle size={14} /> <span className="truncate">{errorMessage}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
