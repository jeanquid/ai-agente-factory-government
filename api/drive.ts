
import { google } from 'googleapis';

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

async function getDriveClient() {
    const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
        console.error("Missing GOOGLE_SERVICE_ACCOUNT_JSON environment variable");
        throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON");
    }

    // Handle escaped newlines in private key if present in string
    let credentials;
    try {
        credentials = JSON.parse(credentialsJson);
    } catch (e) {
        console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON", e);
        throw new Error("Invalid GOOGLE_SERVICE_ACCOUNT_JSON");
    }

    const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: SCOPES,
    });

    return google.drive({ version: 'v3', auth });
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
