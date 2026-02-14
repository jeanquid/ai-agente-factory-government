import { GoogleAuth } from 'google-auth-library';
import { Readable } from 'stream';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getAuthClient() {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
    }

    let credentials;
    try {
        let cleanJson = credentialsJson.trim();
        // Remove wrapping quotes if present
        if ((cleanJson.startsWith("'") && cleanJson.endsWith("'")) ||
            (cleanJson.startsWith('"') && cleanJson.endsWith('"'))) {
            cleanJson = cleanJson.substring(1, cleanJson.length - 1);
        }
        credentials = JSON.parse(cleanJson);

        // Fix potential escaped newlines in private key
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }

    } catch (e: any) {
        console.error("Failed to parse Service Account JSON:", e.message);
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON format");
    }

    const auth = new GoogleAuth({
        credentials,
        scopes: SCOPES,
    });

    return auth.getClient();
}

// Low-level helper to make authenticated requests to Drive API
async function driveRequest(method: string, endpoint: string, body?: any) {
    const client = await getAuthClient();
    const url = `https://www.googleapis.com/drive/v3/${endpoint}`;

    // google-auth-library's request method handles auth headers automatically
    const res = await client.request({
        url,
        method,
        data: body,
        headers: { 'Content-Type': 'application/json' }
    });

    return res.data;
}

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    // 1. Search for existing folder
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    try {
        const searchRes: any = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id,name)`);

        if (searchRes.files && searchRes.files.length > 0) {
            return searchRes.files[0].id;
        }

        // 2. Create if not found
        const createBody: any = {
            name,
            mimeType: 'application/vnd.google-apps.folder'
        };
        if (parentId) {
            createBody.parents = [parentId];
        }

        const createRes: any = await driveRequest('POST', 'files?fields=id', createBody);
        return createRes.id;

    } catch (e: any) {
        console.error(`Error in findOrCreateFolder(${name}):`, e.message);
        throw e;
    }
}

export async function uploadOrUpdateTextFile(folderId: string, filename: string, content: string, mimeType = 'application/json'): Promise<string> {
    // 1. Search for existing file
    const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;

    try {
        const searchRes: any = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
        const existingFile = searchRes.files?.[0];

        if (existingFile) {
            // Update existing file
            // For simple text updates, we use upload API with PATCH
            // But google-auth-library request helper is for JSON API. 
            // For file uploads properly we'd use 'upload/drive/v3/files' but for small text JSON updates,
            // we can use the upload endpoint with multipart, OR just keep it simple:
            // The JSON API 'PATCH /files/ID' only updates metadata.
            // To update content we need distinct upload logic.

            // SIMPLIFICATION: For this prototype, to avoid complex multipart logic without 'googleapis',
            // we will DELETE the old file and CREATE a new one. It's slower but robust for plain text/json.

            try {
                await driveRequest('DELETE', `files/${existingFile.id}`);
            } catch (ign) { /* ignore if already gone */ }
        }

        // Create new file
        const createBody = {
            name: filename,
            parents: [folderId],
            mimeType
        };

        // We can use the 'upload' endpoint for content, but it's tricky with raw fetch.
        // Let's use the standard 'multipart/related' upload if possible, OR
        // allow google-auth-library to handle it if we pass the right body?
        // Actually, for small text files, we can just use the 'media' upload type if we had the library.

        // FALLBACK: Use the google-auth-library 'request' to hit the upload endpoint strictly.
        // But constructing multipart body manually is error prone.

        // ALTERNATIVE: Use the `googleapis` way but via raw request? No.

        // LET'S TRY: Simple POST to /upload/drive/v3/files?uploadType=media
        // This only works if we don't care about metadata (filenames) in the same call.
        // But we DO care about filenames and parents.

        // OK, Manual Multipart Body Construction for "multipart" uploadType.
        const boundary = '-------314159265358979323846';
        const delimiter = "\r\n--" + boundary + "\r\n";
        const close_delim = "\r\n--" + boundary + "--";

        const metadata = JSON.stringify({
            name: filename,
            mimeType: mimeType,
            parents: [folderId]
        });

        const multipartBody =
            delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            metadata +
            delimiter +
            `Content-Type: ${mimeType}\r\n\r\n` +
            content +
            close_delim;

        const client = await getAuthClient();
        const res = await client.request({
            url: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            method: 'POST',
            data: multipartBody,
            headers: {
                'Content-Type': `multipart/related; boundary=${boundary}`
            }
        });

        return (res.data as any).id;

    } catch (e: any) {
        console.error(`Error uploading file ${filename}:`, e.message);
        throw e;
    }
}

export async function downloadTextFile(fileId: string): Promise<string> {
    try {
        const client = await getAuthClient();
        const res = await client.request({
            url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            method: 'GET',
            responseType: 'text' // We are expecting text/json
        });
        return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (e: any) {
        console.error(`Error downloading file ${fileId}:`, e.message);
        throw e;
    }
}

export async function findFileByName(folderId: string, filename: string): Promise<string | null> {
    const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;
    try {
        const res: any = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id)`);
        if (res.files && res.files.length > 0) {
            return res.files[0].id;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function findRunFolder(runId: string): Promise<string | null> {
    try {
        // Find Root -> Tenant -> Runs -> Run-{id}
        // This is expensive to traverse every time.
        // Shortcut: Search globally for "run-{runId}"? Name collisions possible but unlikely with UUID.
        // Let's assume name is unique enough: `run-${runId}`

        const query = `name='run-${runId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const res: any = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id)`);

        if (res.files && res.files.length > 0) {
            return res.files[0].id;
        }

        return null;
    } catch (e) {
        console.error("Error finding run folder:", e);
        return null;
    }
}
