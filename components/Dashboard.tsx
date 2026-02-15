import React from 'react';
import { agents, governanceRules } from '../data';
import { ArrowRight, ShieldCheck, Users, Lock, Database, Activity } from 'lucide-react';
import { AgentProfile } from '../types';

interface DashboardProps {
  onNavigate: (view: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-12 animate-fade-in">
      <header className="mb-12 flex flex-col items-start gap-6">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Government of Agents</h1>
          <p className="text-slate-400 text-lg max-w-3xl">
            Centralized control plane for the definition, orchestration, and governance of specialized AI agents.
            Strict adherence to the <span className="text-indigo-400 font-semibold">Enterprise Protocol</span>.
          </p>
        </div>
        <button
          onClick={() => onNavigate('orchestration')}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center gap-2"
        >
          <span>Launch Multi-Agent Fabrication</span>
          <ArrowRight size={20} />
        </button>
      </header>

      {/* Governance Rules Section */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <ShieldCheck className="text-emerald-500 w-6 h-6" />
          <h2 className="text-2xl font-semibold text-white">Non-Negotiable Government Rules</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {governanceRules.map((rule, idx) => (
            <div key={idx} className="bg-slate-900/50 border border-slate-800 p-5 rounded-xl hover:border-slate-700 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-bold text-slate-200">{rule.title}</h3>
                {rule.mandatory && (
                  <span className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded uppercase font-bold border border-red-900/50">Mandatory</span>
                )}
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents Grid */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <Users className="text-indigo-400 w-6 h-6" />
          <h2 className="text-2xl font-semibold text-white">Active Agents Roster</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <AgentSummaryCard key={agent.id} agent={agent} onClick={() => onNavigate(agent.id)} />
          ))}
        </div>
      </section>

      {/* System Status Footer */}
      <section className="border-t border-slate-800 pt-8 mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex items-center gap-4 text-slate-400">
          <div className="p-3 bg-slate-900 rounded-lg">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Storage Strategy</div>
            <div className="text-slate-200 font-medium">Multi-tenant (tenant_id)</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <div className="p-3 bg-slate-900 rounded-lg">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Audit Level</div>
            <div className="text-slate-200 font-medium">Full Context & Embeddings</div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          <div className="p-3 bg-slate-900 rounded-lg">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide font-semibold text-slate-500">Security Standard</div>
            <div className="text-slate-200 font-medium">Secrets Management (Vault)</div>
          </div>
        </div>
      </section>
    </div>
  );
};

const AgentSummaryCard: React.FC<{ agent: AgentProfile; onClick: () => void }> = ({ agent, onClick }) => {
  // Determine color theme for card
  let themeClass = 'hover:border-slate-600';
  let buttonClass = 'text-slate-400 group-hover:text-white';

  if (agent.color === 'purple') {
    themeClass = 'hover:border-purple-500/50 hover:bg-purple-900/5';
    buttonClass = 'text-purple-400';
  } else if (agent.color === 'blue') {
    themeClass = 'hover:border-blue-500/50 hover:bg-blue-900/5';
    buttonClass = 'text-blue-400';
  } else if (agent.color === 'orange') {
    themeClass = 'hover:border-orange-500/50 hover:bg-orange-900/5';
    buttonClass = 'text-orange-400';
  } else if (agent.color === 'red') {
    themeClass = 'hover:border-red-500/50 hover:bg-red-900/5';
    buttonClass = 'text-red-400';
  } else if (agent.color === 'emerald') {
    themeClass = 'hover:border-emerald-500/50 hover:bg-emerald-900/5';
    buttonClass = 'text-emerald-400';
  } else if (agent.color === 'cyan') {
    themeClass = 'hover:border-cyan-500/50 hover:bg-cyan-900/5';
    buttonClass = 'text-cyan-400';
  }

  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer bg-slate-900 border border-slate-800 rounded-xl p-6 transition-all duration-300 ${themeClass}`}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{agent.name}</h3>
          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded bg-slate-800 ${buttonClass}`}>
            {agent.role}
          </span>
        </div>
      </div>

      <p className="text-slate-400 text-sm mb-6 line-clamp-3 min-h-[60px]">
        {agent.mission}
      </p>

      <div className={`flex items-center gap-2 text-sm font-medium ${buttonClass}`}>
        View Protocols <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  );
};
