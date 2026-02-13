
import { IncomingMessage, ServerResponse } from 'http';
import { findOrCreateFolder, uploadOrUpdateTextFile } from '../drive';
import { RunState } from '../types';
import crypto from 'crypto';

interface VercelRequest extends IncomingMessage {
    body: any;
}

interface VercelResponse extends ServerResponse {
    json: (body: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    send: (body: any) => VercelResponse;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { tenantId = 'default', mission, workflowOrder } = req.body;

    if (!mission) {
        return res.status(400).json({ error: 'Missing mission' });
    }
    if (!workflowOrder || !Array.isArray(workflowOrder)) {
        return res.status(400).json({ error: 'Missing or invalid workflowOrder' });
    }

    const runId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
        console.log(`Starting run ${runId} for mission: ${mission.substring(0, 50)}...`);

        // Drive Structure Creation
        // 1. Root
        const rootName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'AgentFactory';
        const rootId = await findOrCreateFolder(rootName);

        // 2. Tenant
        const tenantIdFolder = await findOrCreateFolder(`tenant-${tenantId}`, rootId);

        // 3. Runs
        const runsId = await findOrCreateFolder('runs', tenantIdFolder);

        // 4. Run Folder
        const runFolderId = await findOrCreateFolder(`run-${runId}`, runsId);

        // 5. Subfolders
        await findOrCreateFolder('steps', runFolderId);
        await findOrCreateFolder('final', runFolderId);

        // Initial State
        const initialState: RunState = {
            runId,
            tenantId,
            mission,
            createdAt: timestamp,
            workflow: {
                order: workflowOrder,
                currentStep: 0
            },
            steps: [],
            artifacts: []
        };

        // Persist files
        await uploadOrUpdateTextFile(runFolderId, 'run.json', JSON.stringify(initialState, null, 2));
        await uploadOrUpdateTextFile(runFolderId, 'workflow.json', JSON.stringify({ order: workflowOrder, mission }, null, 2));

        const auditEntry = { ts: timestamp, runId, tenantId, event: 'RUN_STARTED', mission };
        await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', JSON.stringify(auditEntry));

        res.status(200).json({ ok: true, runId, state: initialState });

    } catch (error: any) {
        console.error("Failed to start run:", error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
