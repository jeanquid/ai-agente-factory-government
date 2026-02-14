import React, { useState, useEffect, useRef } from 'react';
import { agents } from '../api/_data';
import { AgentProfile, RunState, RunStep } from '../api/types';
import {
    Play,
    CheckCircle,
    Loader2,
    Terminal,
    ArrowRight,
    MessageSquare,
    Database,
    Workflow,
    Shield,
    Megaphone,
    Brain,
    RefreshCw,
    Search
} from 'lucide-react';

interface LogEntry {
    agentId: string;
    message: string;
    timestamp: Date;
    type: 'info' | 'success' | 'error';
}

export const AgentOrchestration: React.FC = () => {
    const [mission, setMission] = useState('');
    const [runId, setRunId] = useState('');
    const [inputRunId, setInputRunId] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [isProcessingStep, setIsProcessingStep] = useState(false);
    const [runState, setRunState] = useState<RunState | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const logsEndRef = useRef<HTMLDivElement>(null);

    // Default workflow order if starting new
    const workflowOrder = ['javier', 'fabricio', 'martin', 'damian', 'agustina'];

    const activeAgentIndex = runState ? runState.workflow.currentStep : -1;
    const activeAgentId = runState && activeAgentIndex < runState.workflow.order.length
        ? runState.workflow.order[activeAgentIndex]
        : null;
    const activeAgent = activeAgentId ? agents.find(a => a.id === activeAgentId) : null;

    const scrollToBottom = () => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [logs]);

    const addLog = (agentId: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
        setLogs(prev => [...prev, { agentId, message, timestamp: new Date(), type }]);
    };

    const loadRun = async () => {
        if (!inputRunId) return;
        try {
            addLog('system', `Loading run ${inputRunId}...`, 'info');
            const res = await fetch(`/api/runs/${inputRunId}/status`);
            if (!res.ok) throw new Error('Run not found');
            const data: RunState = await res.json();
            setRunState(data);
            setRunId(data.runId);
            setMission(data.mission);

            // Rebuild logs from state
            const newLogs: LogEntry[] = [];
            newLogs.push({ agentId: 'system', message: `Loaded run ${data.runId}`, timestamp: new Date(data.createdAt), type: 'info' });
            data.steps.forEach(step => {
                newLogs.push({ agentId: step.agentId, message: `Step ${step.step} started`, timestamp: new Date(step.startedAt || new Date()), type: 'info' });
                if (step.status === 'completed') {
                    newLogs.push({ agentId: step.agentId, message: `Step ${step.step} completed`, timestamp: new Date(step.finishedAt || new Date()), type: 'success' });
                }
            });
            setLogs(newLogs);

            if (data.workflow.currentStep < data.workflow.order.length) {
                setIsRunning(true); // Auto-resume? Or just allow user to click next?
                // Let's allow user to continue
            } else {
                addLog('system', 'Run already completed.', 'success');
            }

        } catch (e: any) {
            addLog('system', `Failed to load run: ${e.message}`, 'error');
        }
    };

    const startRun = async () => {
        if (!mission.trim()) return;

        setIsRunning(true);
        setLogs([]);
        setRunState(null);

        addLog('system', `Initializing Factory Protocol for mission: "${mission}"`, 'info');

        try {
            const res = await fetch('/api/runs/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId: 'default',
                    mission,
                    workflowOrder
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to start run');
            }

            const data = await res.json();
            setRunId(data.runId);
            setRunState(data.state);
            addLog('system', `Run initialized with ID: ${data.runId}`, 'success');

        } catch (error: any) {
            addLog('system', `Error starting run: ${error.message}`, 'error');
            setIsRunning(false);
        }
    };

    const processNextStep = async () => {
        if (!runId || !runState || isProcessingStep) return;

        const currentStepIdx = runState.workflow.currentStep;
        const totalSteps = runState.workflow.order.length;

        if (currentStepIdx >= totalSteps) {
            setIsRunning(false);
            addLog('system', 'Factory Protocol Complete. All artifacts generated.', 'success');
            return;
        }

        const nextAgentId = runState.workflow.order[currentStepIdx];
        const agentName = agents.find(a => a.id === nextAgentId)?.name || nextAgentId;

        setIsProcessingStep(true);
        addLog('system', `Handing over control to ${agentName}...`, 'info');

        try {
            const res = await fetch(`/api/runs/${runId}/execute`, {
                method: 'POST'
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to execute step');
            }

            const data = await res.json();
            setRunState(data.state);
            addLog(nextAgentId, `${agentName} tasks completed successfully.`, 'success');

            // Auto-continue logic if desired, or relying on useEffect?
            // Let's rely on useEffect to trigger next if isRunning is true

        } catch (error: any) {
            addLog(nextAgentId, `Error executing step: ${error.message}`, 'error');
            setIsRunning(false); // Stop on error
        } finally {
            setIsProcessingStep(false);
        }
    };

    // Auto-advance effect
    useEffect(() => {
        if (isRunning && runState && !isProcessingStep) {
            const currentStepIdx = runState.workflow.currentStep;
            const totalSteps = runState.workflow.order.length;

            if (currentStepIdx < totalSteps) {
                // Add a small delay for visual pacing
                const timer = setTimeout(() => {
                    processNextStep();
                }, 1000);
                return () => clearTimeout(timer);
            } else {
                setIsRunning(false);
                addLog('system', 'Workflow finished naturally.', 'success');
            }
        }
    }, [isRunning, runState, isProcessingStep]);

    const getAgentIcon = (iconName: string, size = 20) => {
        switch (iconName) {
            case 'Brain': return <Brain size={size} />;
            case 'Database': return <Database size={size} />;
            case 'Workflow': return <Workflow size={size} />;
            case 'Shield': return <Shield size={size} />;
            case 'Megaphone': return <Megaphone size={size} />;
            default: return <Brain size={size} />;
        }
    };

    return (
        <div className="space-y-8 animate-fade-in pb-12">
            <header className="mb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-bold text-white mb-2">Multi-Agent Orchestrator</h1>
                    <p className="text-slate-400">Synchronous fabrication chain (v3) with Drive Persistence.</p>
                </div>
                <div className="flex gap-2">
                    <input
                        className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-white"
                        placeholder="Load Run ID..."
                        value={inputRunId}
                        onChange={e => setInputRunId(e.target.value)}
                    />
                    <button onClick={loadRun} className="bg-slate-800 hover:bg-slate-700 text-white px-3 py-1 rounded text-sm flex items-center gap-2">
                        <Search size={14} /> Load
                    </button>
                    {runId && (
                        <div className="bg-indigo-900/50 text-indigo-200 px-3 py-1 rounded text-sm border border-indigo-500/30">
                            Run ID: {runId}
                        </div>
                    )}
                </div>
            </header>

            {/* Input Section */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Mission Objective</label>
                        <input
                            type="text"
                            value={mission}
                            onChange={(e) => setMission(e.target.value)}
                            placeholder="e.g., Create a Legal Assistant for contract review..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-600"
                            disabled={isRunning || (!!runId && runState?.workflow.currentStep !== 0)}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={startRun}
                            disabled={isRunning || !mission || (!!runId)}
                            className={`
                        h-[50px] px-8 rounded-lg font-bold flex items-center gap-2 transition-all
                        ${isRunning || !mission || (!!runId)
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}
                    `}
                        >
                            {isRunning ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                            {isRunning ? 'RUNNING...' : 'START RUN'}
                        </button>
                        {runId && !isRunning && runState && runState.workflow.currentStep < runState.workflow.order.length && (
                            <button
                                onClick={() => setIsRunning(true)}
                                className="h-[50px] px-6 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center gap-2"
                            >
                                <RefreshCw size={18} />
                                RESUME
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-[600px]">

                {/* Visualization Pane (Left) */}
                <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-8 relative overflow-hidden flex flex-col items-center justify-start">
                    {/* Background Grid */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />

                    {/* Agent Nodes */}
                    <div className="relative z-10 w-full max-w-2xl mt-8">
                        <div className="flex justify-between items-center relative">
                            {/* Connection Line */}
                            <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-800 -z-10">
                                <div
                                    className="h-full bg-indigo-500 transition-all duration-500 ease-linear"
                                    style={{
                                        width: activeAgentIndex === -1 ? '0%' : `${((activeAgentIndex) / (workflowOrder.length - 1)) * 100}%`
                                    }}
                                />
                            </div>

                            {workflowOrder.map((agentId, index) => {
                                const agent = agents.find(a => a.id === agentId)!;
                                const isActive = index === activeAgentIndex;
                                const isCompleted = index < activeAgentIndex;

                                let colorClass = 'border-slate-700 bg-slate-800 text-slate-500';
                                if (isActive) colorClass = 'border-indigo-500 bg-indigo-900/20 text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.3)] scale-110';
                                if (isCompleted) colorClass = 'border-emerald-500 bg-emerald-900/20 text-emerald-400';

                                return (
                                    <div key={agentId} className="flex flex-col items-center gap-4 transition-all duration-500">
                                        <div className={`
                                    w-16 h-16 rounded-2xl border-2 flex items-center justify-center relative
                                    transition-all duration-300
                                    ${colorClass}
                                `}>
                                            {getAgentIcon(agent.iconName, 28)}

                                            {isActive && isProcessingStep && (
                                                <span className="absolute -top-2 -right-2 flex h-4 w-4">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500"></span>
                                                </span>
                                            )}
                                            {isCompleted && (
                                                <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-0.5 border-2 border-slate-900">
                                                    <CheckCircle size={12} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-slate-400'}`}>{agent.name}</p>
                                            <p className="text-[10px] uppercase font-bold text-slate-600">{agent.role}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Active Output Display */}
                    <div className="mt-16 w-full max-w-3xl flex-1 flex flex-col gap-4">
                        {runState?.steps.map((step) => {
                            const agent = agents.find(a => a.id === step.agentId);
                            const isLast = step.step === runState.workflow.currentStep; // Confusing logic.
                            // Show all completed steps?
                            return (
                                <div key={step.step} className="bg-black/40 rounded-lg border border-slate-800 p-6 backdrop-blur-sm animate-fade-in text-left">
                                    <div className="flex items-center gap-3 mb-2 text-indigo-400 border-b border-white/10 pb-2">
                                        {getAgentIcon(agent?.iconName || 'Brain', 16)}
                                        <span className="font-bold text-lg">{agent?.name || step.agentId} Output</span>
                                        <span className="text-xs text-slate-500 ml-auto">{new Date(step.finishedAt!).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="prose prose-invert max-w-none prose-sm">
                                        <p className="text-slate-300 italic">{step.summaryMarkdown}</p>
                                        <details className="mt-2 text-xs">
                                            <summary className="cursor-pointer text-indigo-400 hover:text-indigo-300">View Raw Output JSON</summary>
                                            <pre className="bg-slate-950 p-2 rounded mt-2 overflow-x-auto text-emerald-400">
                                                {JSON.stringify(step.outputJson, null, 2)}
                                            </pre>
                                        </details>
                                    </div>
                                </div>
                            );
                        })}

                        {isProcessingStep && activeAgent && (
                            <div className="bg-black/40 rounded-lg border border-slate-800 p-6 backdrop-blur-sm animate-pulse">
                                <div className="flex items-center gap-3 mb-4 text-indigo-400">
                                    {getAgentIcon(activeAgent.iconName)}
                                    <span className="font-bold text-lg">{activeAgent.name} is working...</span>
                                </div>
                                <div className="space-y-2">
                                    <div className="h-2 w-3/4 bg-slate-800 rounded" />
                                    <div className="h-2 w-1/2 bg-slate-800 rounded" />
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* Live Logs (Right) */}
                <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden max-h-[600px]">
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-300">
                            <Terminal size={16} />
                            <span className="font-mono text-sm font-bold">SYSTEM LOGS</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {isRunning && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                            <span className="text-xs text-slate-400 font-mono">{isRunning ? 'LIVE' : 'IDLE'}</span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
                        {logs.length === 0 && (
                            <div className="text-slate-600 italic text-center mt-10">No activity recorded.</div>
                        )}
                        {logs.map((log, i) => {
                            const agent = agents.find(a => a.id === log.agentId);
                            let color = 'text-slate-300';
                            if (log.type === 'error') color = 'text-red-400';
                            if (log.type === 'success') color = 'text-emerald-400';
                            if (agent?.color === 'purple') color = 'text-purple-400';
                            if (agent?.color === 'blue') color = 'text-blue-400';
                            if (agent?.color === 'orange') color = 'text-orange-400';
                            if (agent?.color === 'red') color = 'text-red-400';
                            if (agent?.color === 'emerald') color = 'text-emerald-400';

                            return (
                                <div key={i} className="flex gap-3 animate-fade-in">
                                    <span className="text-slate-600 shrink-0">
                                        {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </span>
                                    <div>
                                        <span className={`font-bold mr-2 ${color}`}>
                                            [{log.agentId === 'system' ? 'KERNEL' : log.agentId.toUpperCase()}]
                                        </span>
                                        <span className="text-slate-400">{log.message}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={logsEndRef} />
                    </div>
                </div>

            </div>
        </div>
    );
};


