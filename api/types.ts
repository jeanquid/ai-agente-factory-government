
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

export type StepStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface RunStep {
    step: number;
    agentId: string;
    status: StepStatus;
    startedAt?: string;
    finishedAt?: string;
    driveFolderId?: string;
    error?: string;
    outputJson?: any;
    summaryMarkdown?: string;
}

export interface Artifact {
    step: number;
    agentId: string;
    name: string;
    kind: 'input' | 'output' | 'summary' | 'audit' | 'run-state' | 'workflow' | 'final-report' | 'final-state';
    driveFileId?: string;
    createdAt: string;
}

export interface RunState {
    runId: string;
    tenantId: string;
    mission: string;
    createdAt: string;
    workflow: {
        order: string[];
        currentStep: number;
    };
    steps: RunStep[];
    artifacts: Artifact[];
}

export interface AgentOutput {
    outputJson: any;
    summaryMarkdown: string;
    nextSuggestions: string[];
}
