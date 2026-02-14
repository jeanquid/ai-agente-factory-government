import { IncomingMessage, ServerResponse } from 'http';
import { findOrCreateFolder, uploadOrUpdateTextFile } from '../drive';
import { RunState } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Define minimal Vercel Types locally to avoid 'npm i @vercel/node' dependency if not desired
interface VercelRequest extends IncomingMessage {
    body: any;
    query: { [key: string]: string | string[] };
    cookies: { [key: string]: string };
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

    // Add global error handler to catch initialization issues
    try {
        console.log("DEBUG: /api/runs/start called");

        if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const { mission, workflowOrder, tenantId = 'default' } = req.body;
        console.log("DEBUG: Body parsed", { mission, tenantId });

        if (!mission) {
            return res.status(400).json({ error: 'Mission is required' });
        }

        // Use uuid package to correspond with import { v4 as uuidv4 } from 'uuid';
        // Note: You need to make sure 'uuid' is imported at the top.
        // I will assume the import is `import { v4 as uuidv4 } from 'uuid';` based on previous context.
        const runId = uuidv4();
        console.log(`DEBUG: Generated RunID: ${runId}`);

        // --- 1. Initialize Drive Structure ---
        console.log(`[${runId}] Initializing Drive structure...`);
        // let drive; // This variable is not used in the provided snippet, so commenting out or removing.

        // The original code had `getDriveClient()` which is not imported.
        // Assuming `findOrCreateFolder` and `uploadOrUpdateTextFile` implicitly handle drive client.
        // The error handling for drive client init is removed as it's not directly applicable with current imports.

        // --- Try finding/creating root folder ---
        let rootFolderId;
        try {
            const rootFolderName = process.env.GOOGLE_DRIVE_ROOT_FOLDER_NAME || 'AgentFactory';
            rootFolderId = await findOrCreateFolder(rootFolderName);
            console.log(`[${runId}] Root folder ID: ${rootFolderId}`);
        } catch (e: any) {
            console.error("FATAL: Root Folder Access Failed:", e.message);
            return res.status(500).json({ error: `Drive Access Error: ${e.message}` });
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
        const initialState: RunState = {
            runId,
            tenantId,
            mission,
            createdAt: new Date().toISOString(),
            status: 'running', // Added status
            workflow: {
                order: workflowOrder || ['javier', 'fabricio', 'martin', 'damian', 'agustina'], // Default workflow
                currentStep: 0
            },
            steps: [],
            artifacts: [],
            driveIds: { // Added driveIds
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
        await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', JSON.stringify(auditLog), 'application/json'); // In real app, append mode

        return res.status(200).json({
            ok: true,
            runId,
            state: initialState
        });

    } catch (error: any) {
        console.error('Unhandled Server Error:', error);
        return res.status(500).json({
            error: `Internal Server Error: ${error.message}`,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}
