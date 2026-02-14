
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveClient() {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    if (!credentialsJson) {
        console.error("CRITICAL ERROR: GOOGLE_SERVICE_ACCOUNT_JSON environment variable is missing.");
        throw new Error("Server configuration error: Missing Google Credentials.");
    }

    let credentials;
    try {
        // Clean up the JSON string to be extremely robust against copy-paste errors
        let cleanJson = credentialsJson.trim();

        // Remove potential wrapping quotes (single or double) if they exist at extremes
        if ((cleanJson.startsWith("'") && cleanJson.endsWith("'")) ||
            (cleanJson.startsWith('"') && cleanJson.endsWith('"'))) {
            cleanJson = cleanJson.substring(1, cleanJson.length - 1);
        }

        // Attempt to parse
        credentials = JSON.parse(cleanJson);

        // Fix private_key unescaping if needed
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }
    } catch (e: any) {
        console.error("CRITICAL ERROR: Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON. Content might be malformed.", e.message);
        // Log first few chars to debug (safe-ish)
        console.error("JSON Start Snippet:", credentialsJson.substring(0, 20));
        throw new Error("Server configuration error: Invalid Google Credentials JSON.");
    }

    try {
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: SCOPES,
        });
        return google.drive({ version: 'v3', auth });
    } catch (e: any) {
        console.error("CRITICAL ERROR: GoogleAuth initialization failed.", e.message);
        throw new Error("Authentication failed with Google services.");
    }
}

export async function findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    const drive = await getDriveClient();
    const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false${parentId ? ` and '${parentId}' in parents` : ''}`;

    try {
        const res = await drive.files.list({
            q,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id!;
        }

        const fileMetadata: any = {
            name,
            mimeType: 'application/vnd.google-apps.folder',
        };
        if (parentId) {
            fileMetadata.parents = [parentId];
        }

        const file = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id',
        });

        return file.data.id!;
    } catch (error) {
        console.error("Error in findOrCreateFolder:", error);
        throw error;
    }
}

export async function uploadOrUpdateTextFile(folderId: string, filename: string, content: string, mimeType = 'application/json'): Promise<string> {
    const drive = await getDriveClient();
    const q = `name='${filename}' and '${folderId}' in parents and trashed=false`;

    try {
        const res = await drive.files.list({ q, fields: 'files(id)' });

        const media = {
            mimeType,
            body: content
        };

        if (res.data.files && res.data.files.length > 0) {
            // Update
            const fileId = res.data.files[0].id!;
            await drive.files.update({
                fileId,
                media,
            });
            return fileId;
        } else {
            // Create
            const fileMetadata = {
                name: filename,
                parents: [folderId]
            };
            const file = await drive.files.create({
                requestBody: fileMetadata,
                media,
                fields: 'id',
            });
            return file.data.id!;
        }
    } catch (error) {
        console.error("Error in uploadOrUpdateTextFile:", error);
        throw error;
    }
}

export async function downloadTextFile(fileId: string): Promise<string> {
    const drive = await getDriveClient();
    try {
        const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
        // With responseType: 'text', data should be the string content
        return res.data as unknown as string;
    } catch (error) {
        console.error("Error in downloadTextFile:", error);
        throw error;
    }
}

export async function findFileByName(folderId: string, filename: string): Promise<string | null> {
    const drive = await getDriveClient();
    const q = `name='${filename}' and '${folderId}' in parents and trashed=false`;
    try {
        const res = await drive.files.list({ q, fields: 'files(id)' });
        if (res.data.files && res.data.files.length > 0) return res.data.files[0].id!;
        return null;
    } catch (error) {
        console.error("Error in findFileByName:", error);
        throw error;
    }
}

export async function findRunFolder(runId: string): Promise<string | null> {
    const drive = await getDriveClient();
    const q = `mimeType='application/vnd.google-apps.folder' and name='run-${runId}' and trashed=false`;
    try {
        const res = await drive.files.list({ q, fields: 'files(id)' });
        if (res.data.files && res.data.files.length > 0) return res.data.files[0].id!;
        return null; // Not found
    } catch (error) {
        console.error("Error in findRunFolder:", error);
        throw error;
    }
}
