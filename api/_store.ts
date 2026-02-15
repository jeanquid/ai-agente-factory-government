import { RunState, RunStep } from './_types.js';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// IN-MEMORY STORAGE FOR LOCAL DEVELOPMENT
// Data persists only during server session
// For production, switch back to GitHub storage
// ============================================================

const runStore = new Map<string, RunState>();

export async function createRun(data: {
    tenantId: string;
    mission: string;
    workflowOrder: string[]
}): Promise<RunState> {
    const runId = uuidv4();
    const steps: RunStep[] = data.workflowOrder.map((agentId, index) => ({
        step: index + 1,
        agentId,
        status: 'pending'
    }));

    const newState: RunState = {
        runId,
        tenantId: data.tenantId,
        mission: data.mission,
        createdAt: new Date().toISOString(),
        workflow: {
            order: data.workflowOrder,
            currentStep: 0,
        },
        steps,
        artifacts: []
    };

    runStore.set(runId, newState);
    console.log(`✅ [Store] Run ${runId} created (in-memory)`);

    return newState;
}

export async function getRun(runId: string): Promise<RunState | null> {
    const run = runStore.get(runId);
    if (!run) {
        console.warn(`⚠️  [Store] Run ${runId} not found`);
    }
    return run || null;
}

export async function updateRun(
    runId: string,
    updater: (run: RunState) => void
): Promise<RunState> {
    const run = await getRun(runId);
    if (!run) {
        throw new Error(`Run ${runId} not found in store`);
    }

    updater(run);
    runStore.set(runId, run);
    console.log(`✅ [Store] Run ${runId} updated`);

    return run;
}

// Debug helpers
export function getAllRuns(): RunState[] {
    return Array.from(runStore.values());
}

export function clearStore(): void {
    runStore.clear();
    console.log('🗑️  [Store] Cleared');
}
