
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
    color: string;
    iconName: 'Brain' | 'Database' | 'Workflow' | 'Shield' | 'Megaphone';
}

export interface GovernanceRule {
    title: string;
    description: string;
    mandatory: boolean;
}

export interface GeneratePromptRequest {
    agentId: string;
    tenantId: string;
    mission?: string;
    governanceRules?: GovernanceRule[];
}

export interface GeneratePromptResponse {
    ok: boolean;
    promptMarkdown?: string;
    error?: string;
    meta?: {
        agentId: string;
        model: string;
        createdAt: string;
    };
}
