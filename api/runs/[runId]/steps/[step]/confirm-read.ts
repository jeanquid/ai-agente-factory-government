import { updateRun, getRun } from '../../../../_store.ts';
import { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
    query: {
        runId: string;
        step: string;
    };
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

    const { runId, step: stepStr } = req.query;
    const stepNum = parseInt(stepStr as string);

    if (!runId || isNaN(stepNum)) {
        return res.status(400).json({ error: 'Invalid parameters' });
    }

    try {
        const { read } = req.body;
        if (read !== true) {
            return res.status(400).json({ error: 'read must be true' });
        }

        const runState = getRun(runId as string);
        if (!runState) return res.status(404).json({ error: 'Run not found' });

        const stepIndex = stepNum - 1;

        if (!runState.steps[stepIndex]) {
            return res.status(404).json({ error: 'Step not found' });
        }

        const updatedRun = updateRun(runId as string, (run) => {
            const s = run.steps[stepIndex];
            s.readConfirmed = true;
            s.status = 'done';

            // Increment currentStep to unlock next step
            // Only if this was the current active step
            if (run.workflow.currentStep < run.workflow.order.length && (stepIndex) === run.workflow.currentStep) {
                run.workflow.currentStep += 1;

                // If there is a next step, make sure it is initialized properly
                if (run.steps[run.workflow.currentStep]) {
                    // It stays pending until user clicks Execute
                }
            }
        });

        res.status(200).json({ ok: true, state: updatedRun });

    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}
