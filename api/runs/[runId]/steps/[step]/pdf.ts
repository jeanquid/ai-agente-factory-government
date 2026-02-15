import { getRun } from '../../../../_store.js';
import { generateStepPDF } from '../../../../_pdf-generator.js';
import { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
    query: {
        runId: string;
        step: string;
    };
}

interface VercelResponse extends ServerResponse {
    json: (body: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    send: (body: any) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-AI-Model');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { runId, step: stepStr } = req.query;
    const stepNum = parseInt(stepStr as string);

    if (!runId || isNaN(stepNum)) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
        const runState = await getRun(runId as string);

        if (!runState) {
            return res.status(404).json({ error: 'Run not found (Memory flushed)' });
        }

        const currentStep = runState.steps.find(s => s.step === stepNum);

        if (!currentStep || !currentStep.deliverables) {
            return res.status(404).json({ error: 'Step deliverables not found' });
        }

        const pdfBuffer = await generateStepPDF(runState, currentStep);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="step-${String(stepNum).padStart(2, '0')}-${currentStep.agentId}.pdf"`);
        res.end(pdfBuffer);

    } catch (error: any) {
        console.error('PDF Generation Error:', error);
        res.status(500).json({ error: 'Pdf generation failed' });
    }
}
