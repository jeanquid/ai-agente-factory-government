import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { AgentDetail } from './components/AgentDetail';
import { AgentOrchestration } from './components/AgentOrchestration';
import { agents } from './data';
import { AgentProfile } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | string>('dashboard');

  const activeAgent = agents.find(a => a.id === currentView);

  const handleNavigate = (viewId: string) => {
    setCurrentView(viewId);
    window.scrollTo(0, 0);
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={handleNavigate}
    >
      {currentView === 'dashboard' ? (
        <Dashboard onNavigate={handleNavigate} />
      ) : currentView === 'orchestration' ? (
        <AgentOrchestration />
      ) : activeAgent ? (
        <AgentDetail agent={activeAgent} />
      ) : (
        <div className="flex items-center justify-center h-full text-slate-400">
          Agent Not Found
        </div>
      )}
    </Layout>
  );
}

export default App;
