import { getRun } from '../../../../_store.ts';
import { generateStepPDF } from '../../../../_pdf-generator.ts';
import { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
    query: {
        runId: string;
        step: string;
    };
}

interface VercelResponse extends ServerResponse {
    setHeader: (name: string, value: string) => VercelResponse;
    end: (content: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    json: (body: any) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { runId, step: stepStr } = req.query;
    const stepNum = parseInt(stepStr as string);

    if (!runId || isNaN(stepNum)) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
        const runState = getRun(runId as string);

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
