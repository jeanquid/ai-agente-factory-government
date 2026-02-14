import { findRunFolder, downloadTextFile, uploadOrUpdateTextFile, findFileByName, findOrCreateFolder } from '../../github-storage.js';
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
        const runFolder = await findRunFolder(runId); // "data/runs/run-{id}"
        if (!runFolder) return res.status(404).json({ error: 'Run not found' });

        const runJsonPath = await findFileByName(runFolder, 'run.json');
        if (!runJsonPath) return res.status(500).json({ error: 'Corrupted run: run.json missing' });

        const runJsonContent = await downloadTextFile(runJsonPath);
        let runState = JSON.parse(runJsonContent);

        const totalSteps = runState.workflow.order.length;
        const currentStepIndex = runState.workflow.currentStep;

        if (currentStepIndex >= totalSteps) {
            return res.status(200).json({ ok: true, state: runState, message: 'Workflow already completed' });
        }

        const agentId = runState.workflow.order[currentStepIndex];
        const stepNumber = currentStepIndex + 1;

        // Audit: Append logic (DL -> Append -> UL)
        let auditContent = "";
        const auditPath = await findFileByName(runFolder, 'audit.jsonl');
        if (auditPath) {
            try { auditContent = await downloadTextFile(auditPath); } catch (e) { }
        }
        const auditEntry = { ts: new Date().toISOString(), runId, tenantId: runState.tenantId, event: 'STEP_STARTED', step: stepNumber, agentId };
        auditContent += JSON.stringify(auditEntry) + '\n';
        await uploadOrUpdateTextFile(runFolder, 'audit.jsonl', auditContent);

        // Execute Agent
        console.log(`Executing Agent ${agentId} (Step ${stepNumber})`);

        let result;
        try {
            result = await executeAgent(agentId, runState, runState.steps);
        } catch (e) {
            // Log failure
            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'STEP_FAILED', error: e.message }) + '\n';
            await uploadOrUpdateTextFile(runFolder, 'audit.jsonl', auditContent);
            throw e;
        }

        // Save Artifacts to GitHub
        // Use path strings: "data/runs/run-{id}/steps"
        const stepsFolder = await findOrCreateFolder('steps', runFolder);
        const stepFolderName = `${String(stepNumber).padStart(2, '0')}-${agentId}`;
        const stepFolder = await findOrCreateFolder(stepFolderName, stepsFolder);

        await uploadOrUpdateTextFile(stepFolder, 'input.json', JSON.stringify({
            mission: runState.mission,
            context: runState.steps.map(s => ({ agent: s.agentId, output: s.outputJson }))
        }, null, 2));

        if (result.outputJson) {
            await uploadOrUpdateTextFile(stepFolder, 'output.json', JSON.stringify(result.outputJson, null, 2));
        }
        await uploadOrUpdateTextFile(stepFolder, 'summary.md', result.summaryMarkdown || "");

        // Update State
        const newStep = {
            step: stepNumber,
            agentId,
            status: 'completed',
            finishedAt: new Date().toISOString(),
            outputJson: result.outputJson,
            summaryMarkdown: result.summaryMarkdown,
            driveFolderId: stepFolder // This is now a path string in GitHub
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
            const finalFolder = await findOrCreateFolder('final', runFolder);

            const finalReport = `# Final Mission Report: ${runState.mission}\n\n` +
                runState.steps.map(s => `## Step ${s.step}: ${s.agentId}\n${s.summaryMarkdown}`).join('\n\n');

            await uploadOrUpdateTextFile(finalFolder, 'final_report.md', finalReport); // MD
            await uploadOrUpdateTextFile(finalFolder, 'final_state.json', JSON.stringify(runState, null, 2));

            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'RUN_FINISHED' }) + '\n';
            await uploadOrUpdateTextFile(runFolder, 'audit.jsonl', auditContent);
        } else {
            // Update audit with done
            auditContent += JSON.stringify({ ts: new Date().toISOString(), event: 'STEP_DONE', step: stepNumber, agentId }) + '\n';
            await uploadOrUpdateTextFile(runFolder, 'audit.jsonl', auditContent);
        }

        // Save updated RUN.JSON
        await uploadOrUpdateTextFile(runFolder, 'run.json', JSON.stringify(runState, null, 2));

        res.status(200).json({ ok: true, state: runState, stepResult: result });

    } catch (error) {
        console.error("Step execution failed:", error);
        res.status(500).json({ error: error.message || 'Internal Error' });
    }
}
