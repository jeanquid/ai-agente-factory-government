import { RunState, RunStep } from './_types.js';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import { uploadOrUpdateTextFile, downloadTextFile, findRunFolder, findOrCreateFolder } from './_github-storage.js';

// Note: In-memory store is removed. Data is now persisted in GitHub.
// This ensures compatibility with Vercel serverless environments.

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

    // Construct persistent path: data/runs/run-{id}
    const runsFolder = await findOrCreateFolder('runs', 'data');
    const runFolder = await findOrCreateFolder(`run-${runId}`, runsFolder);

    // Save initial state
    await uploadOrUpdateTextFile(runFolder, 'run.json', JSON.stringify(newState, null, 2));

    return newState;
}

export async function getRun(runId: string): Promise<RunState | null> {
    try {
        const runFolder = await findRunFolder(runId);
        if (!runFolder) return null;

        const content = await downloadTextFile(`${runFolder}/run.json`);
        return JSON.parse(content) as RunState;
    } catch (error) {
        console.error(`Error getting run ${runId}:`, error);
        return null;
    }
}

export async function updateRun(runId: string, updater: (run: RunState) => void): Promise<RunState> {
    const run = await getRun(runId);
    if (!run) throw new Error(`Run ${runId} not found`);

    // Apply updates
    updater(run);

    // Persist changes
    const runFolder = `data/runs/run-${runId}`;
    await uploadOrUpdateTextFile(runFolder, 'run.json', JSON.stringify(run, null, 2));

    return run;
}
