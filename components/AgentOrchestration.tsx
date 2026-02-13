import React, { useState, useEffect, useRef } from 'react';
import { agents } from '../data';
import { AgentProfile } from '../types';
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
  Brain
} from 'lucide-react';

interface LogEntry {
  agentId: string;
  message: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error';
}

export const AgentOrchestration: React.FC = () => {
  const [mission, setMission] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeAgentIndex, setActiveAgentIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Define the workflow order
  const workflowOrder = ['javier', 'fabricio', 'martin', 'damian', 'agustina'];
  const activeAgent = activeAgentIndex >= 0 ? agents.find(a => a.id === workflowOrder[activeAgentIndex]) : null;

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const addLog = (agentId: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [...prev, { agentId, message, timestamp: new Date(), type }]);
  };

  const startSimulation = async () => {
    if (!mission.trim()) return;
    
    setIsRunning(true);
    setLogs([]);
    setActiveAgentIndex(-1);
    
    addLog('system', `Initializing Factory Protocol for mission: "${mission}"`, 'info');
    
    // Simulation Loop
    for (let i = 0; i < workflowOrder.length; i++) {
        const agentId = workflowOrder[i];
        const agent = agents.find(a => a.id === agentId)!;
        
        setActiveAgentIndex(i);
        addLog('system', `Handing over control to ${agent.name}...`, 'info');
        
        await simulateAgentWork(agent);
    }

    setActiveAgentIndex(-1);
    setIsRunning(false);
    addLog('system', 'Factory Protocol Complete. All artifacts generated.', 'success');
  };

  const simulateAgentWork = async (agent: AgentProfile) => {
    return new Promise<void>(resolve => {
        // Phase 1: Analysis
        setTimeout(() => {
            addLog(agent.id, `Analyzing requirements related to ${agent.role}...`);
        }, 800);

        // Phase 2: Action
        setTimeout(() => {
            const actions = [
                `Querying vector database for ${agent.role} patterns...`,
                `Validating against Governance Rules...`,
                `Drafting ${agent.outputs[0]}...`,
                `Refining ${agent.outputs[1] || 'artifacts'}...`
            ];
            const randomAction = actions[Math.floor(Math.random() * actions.length)];
            addLog(agent.id, randomAction);
        }, 2500);

        // Phase 3: Completion
        setTimeout(() => {
            addLog(agent.id, `${agent.role} tasks completed successfully.`, 'success');
            resolve();
        }, 4500);
    });
  };

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
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Multi-Agent Orchestrator</h1>
        <p className="text-slate-400">Initialize a synchronous fabrication chain. Watch the agents collaborate to build your solution.</p>
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
                    disabled={isRunning}
                />
            </div>
            <div className="flex items-end">
                <button 
                    onClick={startSimulation}
                    disabled={isRunning || !mission}
                    className={`
                        h-[50px] px-8 rounded-lg font-bold flex items-center gap-2 transition-all
                        ${isRunning || !mission 
                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'}
                    `}
                >
                    {isRunning ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
                    {isRunning ? 'EXECUTING...' : 'START FABRICATION'}
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[600px]">
        
        {/* Visualization Pane (Left) */}
        <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-xl p-8 relative overflow-hidden flex flex-col items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.3)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />

            {/* Agent Nodes */}
            <div className="relative z-10 w-full max-w-2xl">
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
                        const isCompleted = index < activeAgentIndex || (activeAgentIndex === -1 && logs.length > 5); // Rough check for completion
                        const isPending = index > activeAgentIndex;

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
                                    
                                    {isActive && (
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
            <div className="mt-16 w-full max-w-2xl min-h-[150px] bg-black/40 rounded-lg border border-slate-800 p-6 backdrop-blur-sm transition-all">
                {activeAgent ? (
                    <div className="animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-4 text-indigo-400">
                            {getAgentIcon(activeAgent.iconName)}
                            <span className="font-bold text-lg">{activeAgent.name} is working...</span>
                        </div>
                        <div className="space-y-2">
                             <div className="h-2 w-3/4 bg-slate-800 rounded animate-pulse" />
                             <div className="h-2 w-1/2 bg-slate-800 rounded animate-pulse" />
                             <div className="h-2 w-5/6 bg-slate-800 rounded animate-pulse" />
                        </div>
                    </div>
                ) : !isRunning && logs.length > 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-emerald-400 animate-fade-in">
                        <CheckCircle size={48} className="mb-4" />
                        <h3 className="text-xl font-bold">System Online & Ready</h3>
                        <p className="text-slate-400 text-sm mt-2">All agents successfully committed their tasks.</p>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-600 text-sm">
                        Waiting for mission start...
                    </div>
                )}
            </div>

        </div>

        {/* Live Logs (Right) */}
        <div className="lg:col-span-1 bg-slate-950 border border-slate-800 rounded-xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-300">
                    <Terminal size={16} />
                    <span className="font-mono text-sm font-bold">SYSTEM LOGS</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-xs text-red-400 font-mono">LIVE</span>
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
                                {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
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
