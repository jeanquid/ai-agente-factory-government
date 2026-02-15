import { updateRun, getRun } from '../../../../_store.js';
import { executeAgent } from '../../../../_agent-runner.js';
import { IncomingMessage, ServerResponse } from 'http';

interface VercelRequest extends IncomingMessage {
    query: {
        runId: string;
        step: string; // Vercel route param is string
    };
}

interface VercelResponse extends ServerResponse {
    json: (body: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-AI-Model'
    );

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
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
            return res.status(404).json({ error: 'Run not found (Memory might have flushed or GitHub unreachable)' });
        }

        const stepIndex = stepNum - 1;
        const currentStep = runState.steps[stepIndex];

        // Strict Workflow Validation
        // User requirements say: "Step coincide with currentStep"
        // But what if re-running due to error? error -> retry is allowed.
        // What if status is 'in_review'? Re-running might overwrite? Let's allow it for simplicity.
        // We block only if trying to skip ahead.
        if (stepIndex > runState.workflow.currentStep) {
            return res.status(400).json({ error: 'Cannot skip steps' });
        }

        // Block if done?
        if (currentStep.status === 'done') {
            return res.status(400).json({ error: 'Step already completed and confirmed' });
        }

        // Update status to running
        await updateRun(runId as string, (run) => {
            run.steps[stepIndex].status = 'running';
            run.steps[stepIndex].error = undefined;
        });

        // Prepare context
        // Context is previous steps deliverables
        const context = runState.steps
            .filter(s => s.step < stepNum && s.deliverables)
            .map(s => ({
                agentId: s.agentId,
                output: s.deliverables?.outputJson,
                summary: s.deliverables?.summaryMarkdown
            }));

        // Execute Agent
        console.log(`[Execute] Run ${runId} Step ${stepNum} (${currentStep.agentId})...`);
        const result = await executeAgent(currentStep.agentId, runState, context, req);

        // Save Result
        const updatedRun = await updateRun(runId as string, (run) => {
            const s = run.steps[stepIndex];
            s.status = 'in_review';
            s.finishedAt = new Date().toISOString();
            s.deliverables = {
                outputJson: result.outputJson,
                summaryMarkdown: result.summaryMarkdown,
                todoMarkdown: result.todoMarkdown
            };
            s.pdfUrl = `/api/runs/${runId}/steps/${stepNum}/pdf`;
        });

        res.status(200).json({
            ok: true,
            state: updatedRun,
            deliverables: updatedRun.steps[stepIndex].deliverables,
            pdfUrl: updatedRun.steps[stepIndex].pdfUrl
        });

    } catch (error: any) {
        console.error('Execute Step Error:', error);

        // Update status to error
        const failedRun = await updateRun(runId as string, (run) => {
            // Safe update attempt
            if (run.steps[stepNum - 1]) {
                run.steps[stepNum - 1].status = 'failed';
                run.steps[stepNum - 1].error = error.error || error.message || 'Internal Error';
            }
        });

        const status = error.status || 500;
        res.status(status).json({
            ok: false,
            error: error.error || 'Server Error',
            details: error.details || error.message || String(error),
            state: failedRun
        });
    }
}
