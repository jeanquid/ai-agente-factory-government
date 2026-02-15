
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
    iconName: 'Brain' | 'Database' | 'Workflow' | 'Shield' | 'Megaphone' | 'Code';
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

export type StepStatus = 'pending' | 'running' | 'in_review' | 'done' | 'failed';

export interface Deliverables {
    outputJson: any;
    summaryMarkdown: string;
    todoMarkdown: string;
}

export interface RunStep {
    step: number;
    agentId: string;
    status: StepStatus;
    readConfirmed?: boolean;
    startedAt?: string;
    finishedAt?: string;
    deliverables?: Deliverables;
    error?: string;
    pdfUrl?: string; // /api/runs/:runId/steps/:step/pdf
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
    // Artifacts array is deprecated in v3.1 in favor of step.deliverables, kept for compatibility if needed
    artifacts?: Artifact[];
}

export interface AgentOutput {
    outputJson: any;
    summaryMarkdown: string;
    todoMarkdown: string; // Added in v3.1
}
