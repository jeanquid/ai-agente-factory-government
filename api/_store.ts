import { RunState, RunStep } from './types';
import { v4 as uuidv4 } from 'uuid';

// Singleton in-memory store
// Note: This data is lost on Vercel cold starts or redeployments.
// This is acceptable behavior for v3.1 per user requirements.
const runs = new Map<string, RunState>();

export function createRun(data: { tenantId: string; mission: string; workflowOrder: string[] }): RunState {
    const runId = uuidv4();
    const steps: RunStep[] = data.workflowOrder.map((agentId, index) => ({
        step: index + 1,
        agentId,
        status: index === 0 ? 'pending' : 'pending' // Only first step is actionable, but all are technically pending
    }));

    const newState: RunState = {
        runId,
        tenantId: data.tenantId,
        mission: data.mission,
        createdAt: new Date().toISOString(),
        workflow: {
            order: data.workflowOrder,
            currentStep: 0, // 0-indexed cursor for workflow array (matches step 1)
        },
        steps,
        artifacts: []
    };

    runs.set(runId, newState);
    return newState;
}

export function getRun(runId: string): RunState | null {
    return runs.get(runId) || null;
}

export function updateRun(runId: string, updater: (run: RunState) => void): RunState {
    const run = runs.get(runId);
    if (!run) throw new Error(`Run ${runId} not found`);
    updater(run);
    return run;
}
