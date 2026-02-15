import React, { useState, useRef } from 'react';
import { agents } from '../data';
import { RunState, RunStep } from '../api/_types';
import { useLanguage } from '../contexts/LanguageContext';
import {
    Play,
    CheckCircle,
    Loader2,
    FileText,
    Download,
    Eye,
    AlertCircle,
    Brain,
    Database,
    Workflow,
    Shield,
    Megaphone,
    Code,
    Terminal,
    Circle,
    ArrowRight
} from 'lucide-react';
import { ModelSelector } from './ModelSelector';

interface LogEntry {
    agentId: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'error';
}

export const AgentOrchestration: React.FC = () => {
    const [mission, setMission] = useState('');
    const [runState, setRunState] = useState<RunState | null>(null);
    const { t } = useLanguage();
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [readConfirmation, setReadConfirmation] = useState<Record<number, boolean>>({});

    const logsEndRef = useRef<HTMLDivElement>(null);

    const addLog = (agentId: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setLogs(prev => [...prev, { agentId, message, timestamp: new Date(), type }]);
        setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const startRun = async () => {
        if (!mission.trim()) return;

        setIsRunning(true);
        setLogs([]);
        setRunState(null);
        addLog('system', `${t('initializingFactory')} "${mission}"`, 'info');

        const selectedModel = localStorage.getItem('selected_ai_model') || 'gemini-2.5-flash';
        try {
            const res = await fetch('/api/runs/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-AI-Model': selectedModel
                },
                body: JSON.stringify({ mission })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt.substring(0, 120));
            }

            const data = await res.json();
            setRunState(data.state);
            addLog('system', `${t('runIdInitialized')} ${data.runId}`, 'success');

        } catch (error: any) {
            addLog('system', `${t('startupError')} ${error.message}`, 'error');
            setIsRunning(false);
        }
    };

    const executeStep = async (stepNum: number, agentId: string) => {
        if (!runState) return;

        addLog(agentId, `${t('startingExecution').replace('{step}', stepNum.toString())}`, 'info');

        // Optimistic update
        setRunState(prev => {
            if (!prev) return null;
            const newSteps = [...prev.steps];
            newSteps[stepNum - 1].status = 'running';
            return { ...prev, steps: newSteps };
        });

        const selectedModel = localStorage.getItem('selected_ai_model') || 'gemini-2.5-flash';
        try {
            const res = await fetch(`/api/runs/${runState.runId}/steps/${stepNum}/execute`, {
                method: 'POST',
                headers: {
                    'X-AI-Model': selectedModel
                }
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt.substring(0, 150));
            }

            const data = await res.json();
            setRunState(data.state);
            addLog(agentId, t('executionCompletedReview'), 'success');

        } catch (error: any) {
            addLog(agentId, `${t('executionFailed')} ${error.message}`, 'error');
            setRunState(prev => {
                if (!prev) return null;
                const newSteps = [...prev.steps];
                newSteps[stepNum - 1].status = 'failed';
                newSteps[stepNum - 1].error = error.message;
                return { ...prev, steps: newSteps };
            });
        }
    };

    const confirmRead = async (stepNum: number) => {
        if (!runState) return;

        try {
            const res = await fetch(`/api/runs/${runState.runId}/steps/${stepNum}/confirm-read`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ read: true })
            });

            if (!res.ok) {
                const txt = await res.text();
                throw new Error(txt.substring(0, 120));
            }

            const data = await res.json();
            setRunState(data.state);
            addLog('system', t('stepApprovedMoved').replace('{step}', stepNum.toString()), 'info');

        } catch (error: any) {
            addLog('system', `${t('confirmationFailed')} ${error.message}`, 'error');
        }
    };

    const getAgentIcon = (iconName: string, size = 20) => {
        switch (iconName) {
            case 'Brain': return <Brain size={size} />;
            case 'Database': return <Database size={size} />;
            case 'Workflow': return <Workflow size={size} />;
            case 'Shield': return <Shield size={size} />;
            case 'Megaphone': return <Megaphone size={size} />;
            case 'Code': return <Terminal size={size} />;
            default: return <Brain size={size} />;
        }
    };

    return (
        <div className="space-y-8 pb-12">
            <header className="mb-4">
                <h1 className="text-4xl font-bold text-white mb-2">{t('aiFactory')} v3.1 <span className="text-indigo-400 text-lg">{t('inMemoryEdition')}</span></h1>
                <p className="text-slate-400">{t('manualVerificationEnabled')} {t('pdfGenerationActive')}</p>
            </header>

            {/* Mission Input */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex gap-4">
                    <input
                        type="text"
                        value={mission}
                        onChange={(e) => setMission(e.target.value)}
                        placeholder={t('enterMission')}
                        className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white"
                        disabled={!!runState}
                    />
                    <button
                        onClick={startRun}
                        disabled={!!runState || !mission}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-white px-6 rounded-lg font-bold flex items-center gap-2"
                    >
                        {!!runState ? t('runActive') : t('startRun')}
                        <Play size={16} fill="currentColor" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Workflow (Left) */}
                <div className="lg:col-span-2 space-y-6">
                    {runState && runState.steps.map((step) => {
                        const agent = agents.find(a => a.id === step.agentId)!;
                        const isPending = step.status === 'pending';
                        const isRunning = step.status === 'running';
                        const isInReview = step.status === 'in_review';
                        const isDone = step.status === 'done';
                        const isFailed = step.status === 'failed';

                        // Only show if it's the current step or previous step
                        // Actually show all previous steps + current
                        if (step.step > runState.workflow.currentStep + 1) return null;

                        return (
                            <div key={step.step} className={`
                                border rounded-xl overflow-hidden transition-all
                                ${isActiveStep(step, runState) ? 'border-indigo-500 bg-slate-900/80 shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'border-slate-800 bg-slate-900/40'}
                            `}>
                                {/* Header */}
                                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${isActiveStep(step, runState) ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-500'}`}>
                                            {getAgentIcon(agent.iconName)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-white">{agent.name}</h3>
                                            <span className="text-xs text-slate-400 uppercase tracking-widest">{agent.role}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={step.status} />
                                    </div>
                                </div>

                                {/* Body Content */}
                                <div className="p-6">
                                    {isPending && isActiveStep(step, runState) && (
                                        <div className="text-center py-8">
                                            <p className="text-slate-400 mb-4">{t(agent.mission as any)}</p>
                                            <button
                                                onClick={() => executeStep(step.step, step.agentId)}
                                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 mx-auto"
                                            >
                                                <Play size={18} fill="currentColor" />
                                                {t('executeStep')}
                                            </button>
                                        </div>
                                    )}

                                    {isRunning && (
                                        <div className="flex flex-col items-center justify-center py-12 text-indigo-400">
                                            <Loader2 size={40} className="animate-spin mb-4" />
                                            <p className="animate-pulse">{t('thinkingGenerating')}</p>
                                        </div>
                                    )}

                                    {(isInReview || isDone) && step.deliverables && (
                                        <div className="space-y-6">
                                            {/* Summary */}
                                            <div className="prose prose-invert max-w-none bg-slate-950 p-4 rounded-lg border border-slate-800">
                                                <h4 className="text-emerald-400 font-bold flex items-center gap-2 mb-2">
                                                    <FileText size={16} /> {t('executiveSummary')}
                                                </h4>
                                                <div className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                                                    {step.deliverables.summaryMarkdown}
                                                </div>
                                            </div>

                                            {/* Todos */}
                                            <div className="prose prose-invert max-w-none bg-slate-950 p-4 rounded-lg border border-slate-800">
                                                <h4 className="text-orange-400 font-bold flex items-center gap-2 mb-2">
                                                    <AlertCircle size={16} /> {t('actionItemsRisks')}
                                                </h4>
                                                <div className="text-sm text-slate-300 whitespace-pre-wrap font-sans">
                                                    {step.deliverables.todoMarkdown}
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-white/10">
                                                <a
                                                    href={step.pdfUrl || '#'}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm font-bold px-4 py-2 hover:bg-white/5 rounded transition-colors"
                                                >
                                                    <Download size={16} />
                                                    {t('downloadPdf')}
                                                </a>

                                                {step.agentId === 'lucas' && step.deliverables?.outputJson?.downloadUrl && (
                                                    <a
                                                        href={step.deliverables.outputJson.downloadUrl}
                                                        download
                                                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded shadow-lg shadow-emerald-500/20 transition-all border border-emerald-400/30"
                                                    >
                                                        <Download size={16} />
                                                        {t('downloadProject')}
                                                    </a>
                                                )}

                                                {isInReview && (
                                                    <div className="flex items-center gap-4 bg-slate-800/50 p-2 rounded-lg border border-slate-700">
                                                        <label className="flex items-center gap-2 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={readConfirmation[step.step] || false}
                                                                onChange={(e) => setReadConfirmation({ ...readConfirmation, [step.step]: e.target.checked })}
                                                                className="w-5 h-5 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500/50"
                                                            />
                                                            <span className="text-white text-sm">{t('userReviewed')}</span>
                                                        </label>
                                                        <button
                                                            onClick={() => confirmRead(step.step)}
                                                            disabled={!readConfirmation[step.step]}
                                                            className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-4 py-2 rounded font-bold text-sm transition-all"
                                                        >
                                                            {t('confirmContinue')}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {isFailed && (
                                        <div className="text-center py-6">
                                            <div className="text-red-400 bg-red-900/20 p-4 rounded-lg mb-4 text-sm font-mono text-left">
                                                ERROR: {step.error}
                                            </div>
                                            <button
                                                onClick={() => executeStep(step.step, step.agentId)}
                                                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-2 rounded font-bold"
                                            >
                                                {t('retry')}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Logs Right Panel */}
                <div className="lg:col-span-1 space-y-6">
                    <ModelSelector />

                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden flex flex-col max-h-[calc(100vh-500px)] sticky top-4">
                        <div className="p-3 bg-slate-900 border-b border-slate-800 font-mono text-xs font-bold text-slate-400 uppercase">
                            {t('systemEventLog')}
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                            {logs.map((log, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="text-slate-600">{log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</span>
                                    <div>
                                        <span className={`font-bold mr-1 ${log.type === 'error' ? 'text-red-500' : log.type === 'success' ? 'text-emerald-500' : 'text-blue-400'}`}>
                                            [{log.agentId}]
                                        </span>
                                        <span className="text-slate-300">{log.message}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={logsEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => {
    const styles = {
        pending: 'bg-slate-800 text-slate-500',
        running: 'bg-indigo-900/50 text-indigo-400 border border-indigo-500/30 animate-pulse',
        in_review: 'bg-orange-900/50 text-orange-400 border border-orange-500/30',
        done: 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/30',
        failed: 'bg-red-900/50 text-red-400 border border-red-500/30'
    };
    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[status as keyof typeof styles] || styles.pending}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

// Helper to determine if a step is arguably "active" (e.g. ready to run or in review)
// Used for highligting
function isActiveStep(step: RunStep, run: RunState) {
    // If it is the current step cursor
    if (run.workflow.currentStep === step.step - 1) return true;
    return false;
}
