import { findOrCreateFolder, uploadOrUpdateTextFile } from '../github-storage.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
    try {
        console.log("DEBUG: /api/runs/start called (GitHub version)");

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

        // --- 1. Define GitHub Paths ---
        // GitHub Storage Logic: data/runs/run-{id}/
        const runFolder = `data/runs/run-${runId}`;
        const stepsFolder = `${runFolder}/steps`;
        const finalFolder = `${runFolder}/final`;

        console.log(`[${runId}] Creating Run Folder Structure at: ${runFolder}`);

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
            // In GitHub, IDs are Paths.
            driveIds: {
                runFolderId: runFolder, // Path string
                stepsFolderId: stepsFolder,
                finalFolderId: finalFolder
            }
        };

        // --- 3. Persist Initial State ---
        // Save run.json (this actually creates the folder implicitly in GitHub)
        // Note: github-storage expects (folderPath, filename, content)
        // OR we can pass full path. 
        // Our github-storage.js: uploadOrUpdateTextFile(folderPath, filename, content)

        await uploadOrUpdateTextFile(runFolder, 'run.json', JSON.stringify(initialState, null, 2));

        // Optional: Save original mission request
        await uploadOrUpdateTextFile(runFolder, 'workflow.json', JSON.stringify({ mission, workflowOrder }, null, 2));

        // Log run start to audit
        const auditLog = { timestamp: new Date(), event: 'RUN_STARTED', details: { mission } };
        await uploadOrUpdateTextFile(runFolder, 'audit.jsonl', JSON.stringify(auditLog)); // First line

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            ok: true,
            runId,
            state: initialState
        }));

    } catch (error) {
        console.error('Unhandled Server Error (GitHub):', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({
            error: `Internal Server Error: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }));
    }
}
