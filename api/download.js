import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Serverless function to serve ZIP files from the temporary directory.
 * This is required because Vercel has a read-only filesystem except for /tmp.
 */
export default async function handler(req, res) {
    const { file } = req.query;

    if (!file) {
        return res.status(400).json({ error: "Missing file parameter" });
    }

    // Security: Only allow files from /tmp to be downloaded
    // and only .zip files
    const filename = path.basename(file);
    const filePath = path.join(os.tmpdir(), filename);

    if (!fs.existsSync(filePath)) {
        console.error(`[Download API] File not found: ${filePath}`);
        return res.status(404).json({ error: "File not found" });
    }

    if (!filename.endsWith('.zip')) {
        return res.status(403).json({ error: "Forbidden file type" });
    }

    try {
        const stats = fs.statSync(filePath);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
        res.setHeader('Content-Length', stats.size);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('[Download API] Error streaming file:', error);
        res.status(500).json({ error: "Internal server error during download" });
    }
}
