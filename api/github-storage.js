
const GITHUB_API_BASE = 'https://api.github.com';
// We need these env vars:
// GITHUB_ACCESS_TOKEN (The one you just created)
// GITHUB_REPO_OWNER (e.g. 'jeanquid')
// GITHUB_REPO_NAME (e.g. 'ai-agente-factory-government')
// If not set, we try to infer from Vercel env vars or fail.

function getHeaders() {
    const token = process.env.GITHUB_ACCESS_TOKEN;
    if (!token) throw new Error('Missing GITHUB_ACCESS_TOKEN env var');
    return {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'AI-Agent-Factory'
    };
}

function getRepoCoordinates() {
    // You can hardcode these or use env vars
    // Vercel provides: VERCEL_GIT_REPO_OWNER, VERCEL_GIT_REPO_SLUG if linked
    const owner = process.env.GITHUB_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER || 'jeanquid';
    const repo = process.env.GITHUB_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG || 'ai-agente-factory-government';

    if (!owner || !repo) throw new Error('Missing GITHUB_REPO_OWNER or GITHUB_REPO_NAME env vars');
    return { owner, repo };
}

// --- Core Functions ---

// In GitHub, folders don't need explicit creation. We just construct paths.
// This function mimics the Drive API to minimize refactoring elsewhere.
export async function findOrCreateFolder(name, parentPath = '') {
    // GitHub uses paths strings "folder/subfolder", NOT IDs.
    // So "parentPath" here is actually "path to parent folder".
    // If parentPath is falsy, we assume root 'data'.

    // Normalize: ensure no leading/trailing slashes duplicate
    const safeParent = parentPath ? parentPath.replace(/\/$/, '') : 'data';

    // If name is 'steps' or 'runs', just append.
    // e.g. parent='data', name='runs' -> 'data/runs'
    return `${safeParent}/${name}`;
}

// Uploads or updates a file. In GitHub API this is PUT /repos/:owner/:repo/contents/:path
export async function uploadOrUpdateTextFile(folderPath, filename, content, mimeType = 'text/plain') {
    const { owner, repo } = getRepoCoordinates();
    const filePath = `${folderPath}/${filename}`;

    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        attempt++;

        // 1. Check if file exists to get its SHA (needed for update)
        let sha = null;
        try {
            // Add timestamp to query to bypass cache
            const checkRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}?t=${Date.now()}`, {
                headers: getHeaders()
            });
            if (checkRes.ok) {
                const data = await checkRes.json();
                sha = data.sha;
            }
        } catch (e) {
            // Ignore network errors on check, assume new file
        }

        // 2. Upload (Create or Update)
        const contentBase64 = Buffer.from(content).toString('base64');

        const body = {
            message: `Update ${filename} via AI Factory (Attempt ${attempt})`,
            content: contentBase64,
            sha: sha // Include SHA if updating
        };

        const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const result = await res.json();
            return result.content ? result.content.path : filePath;
        }

        // If not 409, throw immediately
        if (res.status !== 409) {
            const errorText = await res.text();
            throw new Error(`GitHub Upload Failed for ${filePath}: ${res.status} ${res.statusText} - ${errorText}`);
        }

        // If 409, wait and retry
        console.warn(`[GitHub Storage] Conflict (409) on ${filePath}. Retrying ${attempt}/${maxRetries}...`);
        // Exponential backoff: 500ms, 1000ms, 2000ms...
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
    }

    throw new Error(`GitHub Upload Failed for ${filePath} after ${maxRetries} retries (Conflict 409)`);
}

export async function downloadTextFile(filePathOrId) {
    // In our abstraction, ID is the File Path.
    const { owner, repo } = getRepoCoordinates();

    // Add timestamp to prevent caching old content which leads to 409s on next write
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${filePathOrId}?t=${Date.now()}`, {
        headers: getHeaders()
    });

    if (!res.ok) {
        throw new Error(`GitHub Download Failed for ${filePathOrId}: ${res.status}`);
    }

    const data = await res.json();
    if (!data.content) throw new Error('File content missing in GitHub response');

    // GitHub returns Base64
    return Buffer.from(data.content, 'base64').toString('utf-8');
}

// Helper to find a file by name "in a folder".
// In GitHub, if we have the folder path, we just look for folderPath/name.
export async function findFileByName(folderPath, name) {
    const fullPath = `${folderPath}/${name}`;
    // We just return the full path if it "might" exist. 
    // The downloader handles 404.
    // But to be compatible with Drive logic (which returns ID or null), lets check existence.

    const { owner, repo } = getRepoCoordinates();
    const res = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${fullPath}?t=${Date.now()}`, {
        method: 'HEAD',
        headers: getHeaders()
    });

    return res.ok ? fullPath : null;
}

// Mock for findRunFolder: In Drive we searched by query. 
// In GitHub we know the structure: data/runs/{runId}.
export async function findRunFolder(runId) {
    if (!runId) return null;
    const path = `data/runs/run-${runId}`;
    // Check if run.json exists inside to confirm it's a valid run folder
    const exists = await findFileByName(path, 'run.json');
    return exists ? path : null;
}
