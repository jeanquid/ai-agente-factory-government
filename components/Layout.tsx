import React from 'react';
import { agents } from '../data';
import { LayoutDashboard, Brain, Database, Workflow, Shield, Megaphone, Menu, X, Rocket, Code, Terminal } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
}

const iconMap: Record<string, React.FC<any>> = {
  Brain: Brain,
  Database: Database,
  Workflow: Workflow,
  Shield: Shield,
  Megaphone: Megaphone,
  Code: Terminal
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden selection:bg-indigo-500/30">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-900 border-r border-slate-800 transform transition-transform duration-200 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xl tracking-tight">
              <Brain className="w-8 h-8" />
              <span>AI FACTORY</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button
              onClick={() => { onNavigate('dashboard'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'dashboard'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
            >
              <LayoutDashboard size={20} />
              <span className="font-medium">Command Center</span>
            </button>

            <button
              onClick={() => { onNavigate('orchestration'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${currentView === 'orchestration'
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
            >
              <Rocket size={20} />
              <span className="font-medium">Fabrication Processor</span>
            </button>

            <div className="pt-6 pb-2 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Specialized Agents
            </div>

            {agents.map((agent) => {
              const Icon = iconMap[agent.iconName];
              const isActive = currentView === agent.id;

              // Dynamic color classes based on active state
              let activeClass = '';
              if (isActive) {
                if (agent.color === 'purple') activeClass = 'bg-purple-500/20 text-purple-400 border-purple-500/30';
                else if (agent.color === 'blue') activeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/30';
                else if (agent.color === 'orange') activeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
                else if (agent.color === 'red') activeClass = 'bg-red-500/20 text-red-400 border-red-500/30';
                else if (agent.color === 'emerald') activeClass = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                else if (agent.color === 'cyan') activeClass = 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
              }

              return (
                <button
                  key={agent.id}
                  onClick={() => { onNavigate(agent.id); setIsSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 border border-transparent ${isActive
                    ? activeClass
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                    }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{agent.name}</span>
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
            <div className="bg-slate-800/50 rounded p-3 text-xs text-slate-500">
              <p className="font-semibold text-slate-400 mb-1">Government Status</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                Active & Compliant
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-slate-950 relative">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden absolute top-4 left-4 p-2 bg-slate-800 rounded-lg text-slate-300 z-30"
        >
          <Menu size={24} />
        </button>
        <div className="p-6 lg:p-12 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
