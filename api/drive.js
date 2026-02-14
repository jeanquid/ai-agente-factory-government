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

    } catch (e) {
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
async function driveRequest(method, endpoint, body) {
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

export async function findOrCreateFolder(name, parentId) {
    // 1. Search for existing folder
    let query = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }

    try {
        const searchRes = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id,name)`);

        if (searchRes.files && searchRes.files.length > 0) {
            return searchRes.files[0].id;
        }

        // 2. Create if not found
        const createBody = {
            name,
            mimeType: 'application/vnd.google-apps.folder'
        };
        if (parentId) {
            createBody.parents = [parentId];
        }

        const createRes = await driveRequest('POST', 'files?fields=id', createBody);
        return createRes.id;

    } catch (e) {
        console.error(`Error in findOrCreateFolder(${name}):`, e.message);
        throw e;
    }
}

export async function uploadOrUpdateTextFile(folderId, filename, content, mimeType = 'application/json') {
    // 1. Search for existing file
    const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;

    try {
        const searchRes = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id,name)`);
        const existingFile = searchRes.files?.[0];

        if (existingFile) {
            try {
                await driveRequest('DELETE', `files/${existingFile.id}`);
            } catch (ign) { /* ignore if already gone */ }
        }

        // Create new file
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

        return res.data.id;

    } catch (e) {
        console.error(`Error uploading file ${filename}:`, e.message);
        throw e;
    }
}

export async function downloadTextFile(fileId) {
    try {
        const client = await getAuthClient();
        const res = await client.request({
            url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
            method: 'GET',
            responseType: 'text' // We are expecting text/json
        });
        return typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
    } catch (e) {
        console.error(`Error downloading file ${fileId}:`, e.message);
        throw e;
    }
}

export async function findFileByName(folderId, filename) {
    const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;
    try {
        const res = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id)`);
        if (res.files && res.files.length > 0) {
            return res.files[0].id;
        }
        return null;
    } catch (e) {
        return null;
    }
}

export async function findRunFolder(runId) {
    try {
        const query = `name='run-${runId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
        const res = await driveRequest('GET', `files?q=${encodeURIComponent(query)}&fields=files(id)`);

        if (res.files && res.files.length > 0) {
            return res.files[0].id;
        }

        return null;
    } catch (e) {
        console.error("Error finding run folder:", e);
        return null;
    }
}
