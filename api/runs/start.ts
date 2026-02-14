import { createRun } from '../../_store';
import { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
    body: any;
}

interface VercelResponse extends ServerResponse {
    json: (body: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { mission, workflowOrder, tenantId = 'default' } = req.body;

        if (!mission) {
            return res.status(400).json({ error: 'Mission is required' });
        }

        const defaultWorkflow = ['javier', 'fabricio', 'martin', 'damian', 'agustina'];

        const runState = createRun({
            tenantId,
            mission,
            workflowOrder: workflowOrder || defaultWorkflow
        });

        res.status(200).json({ ok: true, runId: runState.runId, state: runState });

    } catch (error: any) {
        console.error('Start Run Error:', error);
        res.status(500).json({ error: error.message });
    }
}
