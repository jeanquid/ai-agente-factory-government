import { findRunFolder, downloadTextFile, uploadOrUpdateTextFile, findFileByName, findOrCreateFolder } from '../../drive.js';
import { executeAgent } from '../../agent-runner.js';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') { res.statusCode = 200; res.end(); return; }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed' }); }

    const { runId } = req.query;

    if (!runId) return res.status(400).json({ error: 'Missing runId' });

    try {
        const runFolderId = await findRunFolder(runId);
        if (!runFolderId) return res.status(404).json({ error: 'Run not found' });

        const runJsonFileId = await findFileByName(runFolderId, 'run.json');
        if (!runJsonFileId) return res.status(500).json({ error: 'Corrupted run: run.json missing' });

        const runJsonContent = await downloadTextFile(runJsonFileId);
        let runState = JSON.parse(runJsonContent);

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
        } catch (e) {
            // Log failure
            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'STEP_FAILED', error: e.message }) + '\n';
            await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);
            throw e;
        }

        // Save Artifacts
        const stepsFolderId = await findRunFolder(runId) // Re-fetch or cache?
            .then(id => findOrCreateFolder('steps', id));
        // Logic fix: stepsFolderId might be cached in runState.driveIds but let's re-fetch safely

        // Wait, 'stepsFolderId' was not reliably fetched above in the JS conversion logic.
        // Let's reuse findOrCreateFolder logic to ensure it exists inside runFolder.
        const stepsFolderIdReal = await findOrCreateFolder('steps', runFolderId);

        const stepFolderName = `${String(stepNumber).padStart(2, '0')}-${agentId}`;
        const stepFolderId = await findOrCreateFolder(stepFolderName, stepsFolderIdReal);

        await uploadOrUpdateTextFile(stepFolderId, 'input.json', JSON.stringify({
            mission: runState.mission,
            context: runState.steps.map(s => ({ agent: s.agentId, output: s.outputJson }))
        }, null, 2));

        if (result.outputJson) {
            await uploadOrUpdateTextFile(stepFolderId, 'output.json', JSON.stringify(result.outputJson, null, 2));
        }
        await uploadOrUpdateTextFile(stepFolderId, 'summary.md', result.summaryMarkdown || "");

        // Update State
        const newStep = {
            step: stepNumber,
            agentId,
            status: 'completed',
            finishedAt: new Date().toISOString(),
            outputJson: result.outputJson,
            summaryMarkdown: result.summaryMarkdown,
            driveFolderId: stepFolderId
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
            const finalFolderId = await findOrCreateFolder('final', runFolderId);

            const finalReport = `# Final Mission Report: ${runState.mission}\n\n` +
                runState.steps.map(s => `## Step ${s.step}: ${s.agentId}\n${s.summaryMarkdown}`).join('\n\n');

            await uploadOrUpdateTextFile(finalFolderId, 'final_report.md', finalReport, 'text/markdown');
            await uploadOrUpdateTextFile(finalFolderId, 'final_state.json', JSON.stringify(runState, null, 2));

            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'RUN_FINISHED' }) + '\n';
            await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);
        } else {
            // Update audit with done
            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'STEP_DONE', step: stepNumber, agentId }) + '\n';
            await uploadOrUpdateTextFile(runFolderId, 'audit.jsonl', auditContent);
        }

        await uploadOrUpdateTextFile(runFolderId, 'run.json', JSON.stringify(runState, null, 2));

        res.status(200).json({ ok: true, state: runState, stepResult: result });

    } catch (error) {
        console.error("Step execution failed:", error);
        res.status(500).json({ error: error.message || 'Internal Error' });
    }
}
