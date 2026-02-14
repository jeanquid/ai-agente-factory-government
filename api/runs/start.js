import { findOrCreateFolder, uploadOrUpdateTextFile } from '../drive.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
    try {
        console.log("DEBUG: /api/runs/start called (JS version)");

        if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        const { mission, workflowOrder, tenantId = 'default' } = req.body;
        console.log("DEBUG: Body parsed", { mission, tenantId });

        if (!mission) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'Mission is required' }));
        }

        const runId = uuidv4();
        console.log(`DEBUG: Generated RunID: ${runId}`);

        // --- 1. Initialize Drive Structure ---
        console.log(`[${runId}] Initializing Drive structure...`);

        let rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

        if (!rootFolderId) {
            console.log("No GOOGLE_DRIVE_ROOT_FOLDER_ID provided, attempting to find/create by name...");
            try {
                const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'AgentFactory';
                rootFolderId = await findOrCreateFolder(rootFolderName);
                console.log(`[${runId}] Root folder ID found/created: ${rootFolderId}`);
            } catch (e) {
                console.error("FATAL: Root Folder Access Failed:", e.message);
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: `Drive Access Error: ${e.message}. Quota issues? Share a folder with the SA and set GOOGLE_DRIVE_ROOT_FOLDER_ID.` }));
            }
        } else {
            console.log(`[${runId}] Using Configured Root Folder ID: ${rootFolderId}`);
        }

        // 2. Create Tenant Folder
        const tenantFolderId = await findOrCreateFolder(`tenant-${tenantId}`, rootFolderId);

        // 3. Create Runs Folder
        const runsFolderId = await findOrCreateFolder('runs', tenantFolderId);

        // 4. Create THIS Run Folder
        const runFolderId = await findOrCreateFolder(`run-${runId}`, runsFolderId);

        // 5. Create 'steps' and 'final' subfolders
        const stepsFolderId = await findOrCreateFolder('steps', runFolderId);
        const finalFolderId = await findOrCreateFolder('final', runFolderId);

        // --- 2. Create Initial State ---
        const initialState = {
            runId,
            tenantId,
            mission,
            createdAt: new Date().toISOString(),
            status: 'running',
            workflow: {
                order: workflowOrder || ['javier', 'fabricio', 'martin', 'damian', 'agustina'],
                currentStep: 0
            },
            steps: [],
            artifacts: [],
            driveIds: {
                runFolderId,
                stepsFolderId,
                finalFolderId
            }
        };

        // --- 3. Persist Initial State ---
        await uploadOrUpdateTextFile(runFolderId, 'run.json', JSON.stringify(initialState, null, 2), 'application/json');

        // Optional: Save original mission request
        await uploadOrUpdateTextFile(runFolderId, 'workflow.json', JSON.stringify({ mission, workflowOrder }, null, 2), 'application/json');

        // Log audit
        const auditLog = { timestamp: new Date(), event: 'RUN_STARTED', details: { mission } };
        await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', JSON.stringify(auditLog), 'application/json');

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            ok: true,
            runId,
            state: initialState
        }));

    } catch (error) {
        console.error('Unhandled Server Error:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            error: `Internal Server Error: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }));
    }
}
