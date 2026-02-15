export interface AgentProfile {
  id: string;
  name: string;
  fullName: string;
  role: string;
  mission: string;
  scope: string[];
  outOfScope: string[];
  inputs: string[];
  outputs: string[];
  qualityChecklist: string[];
  procedure: string[];
  templates: string[];
  metrics: {
    description: string;
    chartData: Array<{ name: string; value: number }>;
    chartLabel: string;
  };
  startupQuestions: string[];
  phase1Tasks: string[];
  color: string; // Tailwind color class base (e.g., 'blue', 'purple')
  iconName: 'Brain' | 'Database' | 'Workflow' | 'Shield' | 'Megaphone' | 'Code';
}

export interface GovernanceRule {
  title: string;
  description: string;
  mandatory: boolean;
}
