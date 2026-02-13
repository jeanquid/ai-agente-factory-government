import React from 'react';
import { AgentProfile } from '../types';
import { AgentGenerator } from './AgentGenerator';
import { 
  CheckCircle, 
  XCircle, 
  FileInput, 
  FileOutput, 
  ClipboardList, 
  PlayCircle, 
  FileText, 
  HelpCircle,
  BarChart2,
  ListTodo
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';

interface AgentDetailProps {
  agent: AgentProfile;
}

export const AgentDetail: React.FC<AgentDetailProps> = ({ agent }) => {
  // Dynamic color resolution
  const getColor = (opacity = 1) => {
    switch (agent.color) {
      case 'purple': return `rgba(168, 85, 247, ${opacity})`;
      case 'blue': return `rgba(59, 130, 246, ${opacity})`;
      case 'orange': return `rgba(249, 115, 22, ${opacity})`;
      case 'red': return `rgba(239, 68, 68, ${opacity})`;
      case 'emerald': return `rgba(16, 185, 129, ${opacity})`;
      default: return `rgba(148, 163, 184, ${opacity})`;
    }
  };

  const mainColor = getColor(1);
  const bgSoft = getColor(0.1);
  const borderSoft = getColor(0.3);

  return (
    <div className="space-y-8 pb-12 animate-fade-in-up">
      {/* Header */}
      <div className="border-b border-slate-800 pb-8">
        <div className="flex items-center gap-3 mb-2">
           <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest border" style={{ color: mainColor, borderColor: borderSoft, backgroundColor: bgSoft }}>
             {agent.role}
           </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{agent.fullName}</h1>
        <p className="text-xl text-slate-300 max-w-4xl leading-relaxed">
          {agent.mission}
        </p>
      </div>

      {/* Scope vs Out of Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
           <div className="flex items-center gap-3 mb-6">
             <CheckCircle className="text-emerald-500" />
             <h3 className="text-xl font-bold text-white">In Scope</h3>
           </div>
           <ul className="space-y-3">
             {agent.scope.map((item, i) => (
               <li key={i} className="flex items-start gap-3 text-slate-300">
                 <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                 <span>{item}</span>
               </li>
             ))}
           </ul>
        </div>

        <div className="bg-slate-900/50 rounded-xl border border-slate-800 p-6">
           <div className="flex items-center gap-3 mb-6">
             <XCircle className="text-red-500" />
             <h3 className="text-xl font-bold text-white">Out of Scope</h3>
           </div>
           <ul className="space-y-3">
             {agent.outOfScope.map((item, i) => (
               <li key={i} className="flex items-start gap-3 text-slate-400">
                 <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                 <span>{item}</span>
               </li>
             ))}
           </ul>
        </div>
      </div>

      {/* IO Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
           <div className="flex items-center gap-2 mb-4 text-slate-200 font-semibold uppercase tracking-wider text-sm">
             <FileInput size={18} className="text-slate-400" /> Required Inputs
           </div>
           <ul className="divide-y divide-slate-800">
             {agent.inputs.map((input, i) => (
               <li key={i} className="py-3 text-slate-300 text-sm">{input}</li>
             ))}
           </ul>
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
           <div className="flex items-center gap-2 mb-4 text-slate-200 font-semibold uppercase tracking-wider text-sm">
             <FileOutput size={18} className="text-slate-400" /> Concrete Outputs
           </div>
           <ul className="divide-y divide-slate-800">
             {agent.outputs.map((output, i) => (
               <li key={i} className="py-3 text-indigo-300 text-sm font-medium">{output}</li>
             ))}
           </ul>
        </div>
      </div>

      {/* Metrics Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
             <BarChart2 className="text-slate-400" />
             <h3 className="text-xl font-bold text-white">Performance Metrics</h3>
          </div>
          <span className="text-sm text-slate-400 italic text-right max-w-md">{agent.metrics.description}</span>
        </div>
        
        <div className="h-64 w-full">
           <ResponsiveContainer width="100%" height="100%">
             <AreaChart data={agent.metrics.chartData}>
               <defs>
                 <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                   <stop offset="5%" stopColor={mainColor} stopOpacity={0.3}/>
                   <stop offset="95%" stopColor={mainColor} stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
               <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
               <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                 itemStyle={{ color: mainColor }}
               />
               <Area 
                 type="monotone" 
                 dataKey="value" 
                 stroke={mainColor} 
                 fillOpacity={1} 
                 fill="url(#colorValue)" 
                 strokeWidth={3}
               />
             </AreaChart>
           </ResponsiveContainer>
        </div>
        <p className="text-center text-xs text-slate-500 mt-2 uppercase tracking-widest">{agent.metrics.chartLabel}</p>
      </div>

      {/* Workflow & Procedures */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Startup Questions */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 lg:col-span-1">
           <div className="flex items-center gap-2 mb-6">
             <HelpCircle className="text-yellow-500" />
             <h3 className="text-lg font-bold text-white">Startup Questions</h3>
           </div>
           <div className="space-y-4">
             {agent.startupQuestions.map((q, i) => (
               <div key={i} className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm text-slate-300">
                 <span className="text-slate-500 font-bold mr-2">Q{i+1}:</span> {q}
               </div>
             ))}
           </div>
        </div>

        {/* Operating Procedure */}
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 lg:col-span-2">
           <div className="flex items-center gap-2 mb-6">
             <PlayCircle className="text-blue-500" />
             <h3 className="text-lg font-bold text-white">Standard Operating Procedure</h3>
           </div>
           <div className="space-y-0 relative">
             {/* Connector Line */}
             <div className="absolute left-3 top-2 bottom-4 w-0.5 bg-slate-800" />
             
             {agent.procedure.map((step, i) => (
               <div key={i} className="relative flex items-start gap-4 mb-6 last:mb-0 group">
                 <div className="relative z-10 w-6 h-6 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center text-xs font-bold text-white group-hover:border-indigo-500 group-hover:bg-indigo-600 transition-colors">
                   {i+1}
                 </div>
                 <div className="flex-1 pt-0.5">
                   <p className="text-slate-300 text-sm leading-relaxed">{step.replace(/^\d+\.\s/, '')}</p>
                 </div>
               </div>
             ))}
           </div>
        </div>

      </div>

      {/* Quality & Templates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quality Checklist */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
             <ClipboardList className="text-emerald-400" />
             <h3 className="text-lg font-bold text-white">Quality Assurance Checklist</h3>
          </div>
          <ul className="space-y-3">
            {agent.qualityChecklist.map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                 <div className="mt-1 w-4 h-4 rounded border border-slate-600 flex-shrink-0" />
                 <span className="text-sm text-slate-300">{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Templates */}
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-4">
             <FileText className="text-slate-400" />
             <h3 className="text-lg font-bold text-white">Standard Templates</h3>
          </div>
          <div className="grid gap-3">
            {agent.templates.map((template, i) => (
              <div key={i} className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center gap-3 text-sm text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 cursor-pointer transition-colors">
                <FileText size={16} />
                {template}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Phase 1 Tasks */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl border border-slate-700 p-6">
        <div className="flex items-center gap-3 mb-6">
           <ListTodo className="text-white w-6 h-6" />
           <h3 className="text-xl font-bold text-white">Phase 1: Immediate Tasks</h3>
           <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded">THIS WEEK</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agent.phase1Tasks.map((task, i) => (
             <div key={i} className="bg-black/20 p-4 rounded-lg border border-slate-600/30 backdrop-blur-sm">
                <span className="text-xs font-bold text-slate-500 block mb-2">TASK {i+1}</span>
                <p className="text-slate-200 font-medium text-sm leading-relaxed">{task}</p>
             </div>
          ))}
        </div>
      </div>

      {/* AI GENERATOR SECTION */}
      <AgentGenerator agent={agent} />

    </div>
  );
};
