import { RunState, RunStep } from './_types.js';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import { uploadOrUpdateTextFile, downloadTextFile, findRunFolder, findOrCreateFolder } from './_github-storage.js';

// In-memory store fallback for local development or if GitHub is not configured
const memoryStore = new Map<string, RunState>();

function isGitHubEnabled() {
    return !!process.env.GITHUB_ACCESS_TOKEN;
}

export async function createRun(data: { tenantId: string; mission: string; workflowOrder: string[] }): Promise<RunState> {
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

    if (isGitHubEnabled()) {
        try {
            // Construct persistent path: data/runs/run-{id}
            const runsFolder = await findOrCreateFolder('runs', 'data');
            const runFolder = await findOrCreateFolder(`run-${runId}`, runsFolder);

            // Save initial state
            await uploadOrUpdateTextFile(runFolder, 'run.json', JSON.stringify(newState, null, 2));
        } catch (error) {
            console.error('[Store] GitHub persistence failed, falling back to memory:', error);
            memoryStore.set(runId, newState);
        }
    } else {
        console.log('[Store] GITHUB_ACCESS_TOKEN not found. Using in-memory store.');
        memoryStore.set(runId, newState);
    }

    return newState;
}

export async function getRun(runId: string): Promise<RunState | null> {
    if (!isGitHubEnabled() || memoryStore.has(runId)) {
        return memoryStore.get(runId) || null;
    }

    try {
        const runFolder = await findRunFolder(runId);
        if (!runFolder) return null;

        const content = await downloadTextFile(`${runFolder}/run.json`);
        return JSON.parse(content) as RunState;
    } catch (error) {
        console.error(`Error getting run ${runId}:`, error);
        return memoryStore.get(runId) || null;
    }
}

export async function updateRun(runId: string, updater: (run: RunState) => void): Promise<RunState> {
    const run = await getRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    // Apply updates
    updater(run);

    if (isGitHubEnabled()) {
        try {
            // Persist changes
            const runFolder = `data/runs/run-${runId}`;
            await uploadOrUpdateTextFile(runFolder, 'run.json', JSON.stringify(run, null, 2));
        } catch (error) {
            console.error(`[Store] GitHub update failed for ${runId}, saving to memory:`, error);
            memoryStore.set(runId, run);
        }
    } else {
        memoryStore.set(runId, run);
    }

    return run;
}
