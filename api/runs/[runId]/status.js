import { findRunFolder, downloadTextFile, findFileByName } from '../../drive.js';

export default async function handler(req, res) {
    console.log("DEBUG: Loading run index...");
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
    if (req.method !== 'GET') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    const { runId } = req.query;

    if (!runId) return res.status(400).json({ error: 'Missing runId' });

    try {
        const runFolderId = await findRunFolder(runId);
        if (!runFolderId) return res.status(404).json({ error: 'Run not found' });

        const runJsonFileId = await findFileByName(runFolderId, 'run.json');
        if (!runJsonFileId) return res.status(500).json({ error: 'Corrupted run: run.json missing' });

        const runJsonContent = await downloadTextFile(runJsonFileId);
        const runState = JSON.parse(runJsonContent);

        res.status(200).json(runState);

    } catch (error) {
        console.error("Failed to load run:", error);
        res.status(500).json({ error: error.message || 'Internal Error' });
    }
}
