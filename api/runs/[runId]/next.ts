
import { IncomingMessage, ServerResponse } from 'http';
// @ts-ignore
import { findRunFolder, downloadTextFile, uploadOrUpdateTextFile, findFileByName, findOrCreateFolder } from '../../_github-storage.js';
import { RunState, RunStep } from '../../_types.js';
// @ts-ignore
import { executeAgent } from '../../_agent-runner.js';

interface VercelRequest extends IncomingMessage {
    body: any;
    query: {
        runId: string;
    };
}

interface VercelResponse extends ServerResponse {
    json: (body: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    send: (body: any) => VercelResponse;
}

export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    const { runId } = req.query;

    if (!runId) return res.status(400).json({ error: 'Missing runId' });

    try {
        const runFolderId = await findRunFolder(runId as string);
        if (!runFolderId) return res.status(404).json({ error: 'Run not found' });

        const runJsonFileId = await findFileByName(runFolderId, 'run.json');
        if (!runJsonFileId) return res.status(500).json({ error: 'Corrupted run: run.json missing' });

        const runJsonContent = await downloadTextFile(runJsonFileId);
        let runState: RunState = JSON.parse(runJsonContent);

        const totalSteps = runState.workflow.order.length;
        const currentStepIndex = runState.workflow.currentStep;

        if (currentStepIndex >= totalSteps) {
            return res.status(200).json({ ok: true, state: runState, message: 'Workflow already completed' });
        }

        const agentId = runState.workflow.order[currentStepIndex];
        const stepNumber = currentStepIndex + 1;

        // Audit: STEP_STARTED
        let auditContent = "";
        const auditFileId = await findFileByName(runFolderId, 'audit.jsonl');
        if (auditFileId) {
            auditContent = await downloadTextFile(auditFileId);
        }
        const auditEntry = { ts: new Date().toISOString(), runId, tenantId: runState.tenantId, event: 'STEP_STARTED', step: stepNumber, agentId };
        auditContent += JSON.stringify(auditEntry) + '\n';
        await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);

        // Execute Agent
        console.log(`Executing Agent ${agentId} (Step ${stepNumber})`);

        let result;
        try {
            result = await executeAgent(agentId, runState, runState.steps);
        } catch (e: any) {
            // Log failure
            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'STEP_FAILED', error: e.message }) + '\n';
            await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);
            throw e;
        }

        // Save Artifacts
        const stepsFolderId = await findFileByName(runFolderId, 'steps');
        const stepFolderName = `${String(stepNumber).padStart(2, '0')}-${agentId}`;
        const stepFolderId = await findOrCreateFolder(stepFolderName, stepsFolderId!);

        await uploadOrUpdateTextFile(stepFolderId, 'input.json', JSON.stringify({
            mission: runState.mission,
            context: runState.steps.map(s => ({ agent: s.agentId, output: s.deliverables?.outputJson }))
        }, null, 2));

        await uploadOrUpdateTextFile(stepFolderId, 'output.json', JSON.stringify(result.outputJson, null, 2));
        await uploadOrUpdateTextFile(stepFolderId, 'summary.md', result.summaryMarkdown || ""); // Ensure content

        // Update State
        const newStep: RunStep = {
            step: stepNumber,
            agentId,
            status: 'done',
            finishedAt: new Date().toISOString(),
            deliverables: {
                outputJson: result.outputJson,
                summaryMarkdown: result.summaryMarkdown,
                todoMarkdown: result.todoMarkdown
            }
        };

        runState.steps.push(newStep);
        runState.workflow.currentStep += 1;

        runState.artifacts.push({
            step: stepNumber,
            agentId,
            name: 'output.json',
            kind: 'output',
            createdAt: new Date().toISOString()
        });
        runState.artifacts.push({
            step: stepNumber,
            agentId,
            name: 'summary.md',
            kind: 'summary',
            createdAt: new Date().toISOString()
        });

        // Check Completion
        if (runState.workflow.currentStep >= totalSteps) {
            const finalFolderId = await findFileByName(runFolderId, 'final');
            const finalReport = `# Final Mission Report: ${runState.mission}\n\n` +
                runState.steps.map(s => `## Step ${s.step}: ${s.agentId}\n${s.deliverables?.summaryMarkdown}`).join('\n\n');

            await uploadOrUpdateTextFile(finalFolderId!, 'final_report.md', finalReport, 'text/markdown');
            await uploadOrUpdateTextFile(finalFolderId!, 'final_state.json', JSON.stringify(runState, null, 2));

            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'RUN_FINISHED' }) + '\n';
            await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);
        } else {
            // Update audit with done
            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'STEP_DONE', step: stepNumber, agentId }) + '\n';
            await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);
        }

        await uploadOrUpdateTextFile(runFolderId, 'run.json', JSON.stringify(runState, null, 2));

        res.status(200).json({ ok: true, state: runState, stepResult: result });

    } catch (error: any) {
        console.error("Step execution failed:", error);
        const status = error.status || 500;
        res.status(status).json({
            ok: false,
            error: error.error || 'Server Error',
            details: error.details || error.message || String(error)
        });
    }
}
