import { GoogleGenerativeAI } from "@google/generative-ai";
import { agents } from './_data.js';
import { generateProjectCode } from './_code-generator.js';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import os from 'os';

/**
 * Detects the preferred model from request headers, env, or default.
 */
function getPrimaryModel(req) {
    // 1. From request headers (Frontend selection)
    const headerModel = req?.headers?.['x-ai-model'];
    if (headerModel) return headerModel;

    // 3. Default
    return "gemini-2.5-flash";
}

/**
 * Executes a prompt against Gemini with automatic fallback.
 */
async function generateWithFallback(genAI, systemPrompt, primaryModel) {
    const tryModel = async (modelName) => {
        console.log(`[IA Runner] Attempting generation with model: ${modelName}`);

        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.05,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        return response.text();
    };

    // Try primary model first, then standard fallbacks
    const modelsToTry = Array.from(new Set([
        primaryModel,                  // El que seleccionó el usuario
        "gemini-2.5-flash",           // Fallback 1: Rápido y confiable (v2.5)
        "gemini-flash",               // Fallback 2: Alias estable
        "gemini-2.5-pro",             // Fallback 3: Mayor capacidad (v2.5)
        "gemini-pro"                  // Fallback 4: Alias genérico
    ]));

    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            return await tryModel(modelName);
        } catch (error) {
            const originalError = error.originalError || error;
            const message = originalError.message || String(originalError);
            const status = originalError.status || (originalError.response ? originalError.response.status : null);

            // 1. Auth / Permissions / Region (401, 403)
            if (status === 401 || status === 403 || message.includes("401") || message.includes("403") || message.includes("API_KEY") || message.includes("permission")) {
                console.error(`[IA Runner] Authentication/Permission Error: ${message}`);
                throw { ok: false, error: "API key / permissions / region error", details: message, status: 403 };
            }

            // 2. Quota / Rate Limit (429)
            if (status === 429 || message.includes("429") || message.includes("quota") || message.includes("limit")) {
                console.error(`[IA Runner] Quota/Rate Limit Error: ${message}`);
                if (modelName === primaryModel) {
                    console.warn(`[IA Runner] Primary model ${modelName} hit quota. Trying fallback...`);
                    lastError = { model: modelName, message };
                    continue; // Try next model in list
                }
                throw { ok: false, error: "Quota / rate limit error", details: message, status: 429 };
            }

            // 3. Not Found / Not Supported (404) -> Fallback
            if (status === 404 || message.includes("404") || message.includes("not found") || message.includes("not supported") || message.includes("Model not found")) {
                console.warn(`[IA Runner] Model '${modelName}' not found. Trying next...`);
                lastError = { model: modelName, message };
                continue;
            }

            // 4. Other Errors
            console.error(`[IA Runner] Unexpected error with model ${modelName}:`, message);
            if (modelName === primaryModel) {
                lastError = { model: modelName, message };
                continue;
            }
            throw { ok: false, error: "Model execution failed", details: message, status: 500 };
        }
    }

    throw {
        ok: false,
        error: "All models failed",
        details: lastError ? `Last tried ${lastError.model}: ${lastError.message}` : "No models succeeded",
        status: 500
    };
}

export async function executeAgent(agentId, runState, previousSteps, req) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const primaryModel = getPrimaryModel(req);
    console.log(`[Agent Runner] Executing ${agentId}. Header Model: ${req?.headers?.['x-ai-model'] || 'none'}. Selected: ${primaryModel}`);

    // SPECIAL HANDLING FOR LUCAS - CODE GENERATION
    if (agentId === 'lucas') {
        return await executeLucasCodeGeneration(runState, previousSteps, req);
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Context from previous agents
    const context = previousSteps.map(step => ({
        agentId: step.agentId,
        role: agents.find(a => a.id === step.agentId)?.role,
        output: step.deliverables?.outputJson,
        summary: step.deliverables?.summaryMarkdown,
        todo: step.deliverables?.todoMarkdown
    }));

    const systemPrompt = `
⚠️ CRITICAL OUTPUT FORMAT ⚠️

YOU MUST RESPOND WITH PURE JSON ONLY.

RULES:
1. Your ENTIRE response = ONLY the JSON object
2. NO text before the {
3. NO text after the }
4. NO markdown code fences (no \`\`\`json or \`\`\`)
5. NO explanations
6. Valid, parseable JSON only

REQUIRED JSON STRUCTURE:
{
  "outputJson": { YOUR_WORK_DATA_HERE },
  "summaryMarkdown": "YOUR_SUMMARY_IN_MARKDOWN",
  "todoMarkdown": "YOUR_TODO_LIST_IN_MARKDOWN"
}

EXAMPLE VALID RESPONSE:
{
  "outputJson": {
    "databaseSchema": "...",
    "tables": [],
    "relationships": []
  },
  "summaryMarkdown": "## Database Design\\n\\n...",
  "todoMarkdown": "- Task 1\\n- Task 2"
}

---
You are ${agent.name}, acting as ${agent.role}.
Your mission is: ${runState.mission}.

GOAL:
Execute your specific tasks as part of this mission, building upon the work of previous agents.

CONTEXT FROM PREVIOUS AGENTS:
${JSON.stringify(context, null, 2)}

YOUR AGENT PROFILE:
${JSON.stringify(agent, null, 2)}
`;

    try {
        const text = await generateWithFallback(genAI, systemPrompt, primaryModel);
        if (!text) throw new Error("No content generated from AI");

        let jsonText = text.trim();

        // Remove markdown code fences
        if (jsonText.includes('```')) {
            console.log('[Parser] Removing markdown fences...');
            jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        }

        // Extract JSON object
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        } else {
            console.error('[Parser] No valid JSON boundaries found');
            console.error('[Parser] Raw response:', text.substring(0, 500));
            throw new Error('Response does not contain valid JSON object');
        }

        console.log('[Parser] Cleaned JSON preview:', jsonText.substring(0, 200));

        // Parse
        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (parseError) {
            console.error('[Parser] JSON Parse Error:', parseError.message);
            console.error('[Parser] Failed text:', jsonText.substring(0, 1000));
            throw new Error(`Failed to parse AI response as JSON: ${parseError.message}`);
        }

        // Validate required fields
        const required = ['outputJson', 'summaryMarkdown', 'todoMarkdown'];
        const missing = required.filter(field => !(field in parsed));

        if (missing.length > 0) {
            console.error('[Parser] Missing fields:', missing);
            console.error('[Parser] Received keys:', Object.keys(parsed));
            throw new Error(`Missing required fields: ${missing.join(', ')}`);
        }

        console.log('[Parser] ✅ Valid JSON parsed successfully');

        return {
            outputJson: parsed.outputJson,
            summaryMarkdown: parsed.summaryMarkdown,
            todoMarkdown: parsed.todoMarkdown
        };

    } catch (error) {
        console.error(`[Agent Runner] Error executing agent ${agentId}:`, error);
        if (error.ok === false) throw error;
        throw { ok: false, error: "Agent execution failed", details: error.message || String(error), status: 500 };
    }
}

/**
 * Lucas - The Builder
 */
async function executeLucasCodeGeneration(runState, previousSteps, req) {
    console.log('[Lucas] 🚀 Starting project generation...');
    const primaryModel = getPrimaryModel(req);

    try {
        const specs = {};
        for (const step of previousSteps) {
            if (step.deliverables) {
                specs[step.agentId] = {
                    outputJson: step.deliverables.outputJson,
                    summaryMarkdown: step.deliverables.summaryMarkdown,
                    todoMarkdown: step.deliverables.todoMarkdown
                };
            }
        }

        const projectName = sanitizeProjectName(runState.mission);
        const generatedProject = await generateProjectCode(specs, projectName, primaryModel);
        const projectPath = await createPhysicalProject(generatedProject, projectName);

        // Vercel /tmp redirection
        const outputsDir = os.tmpdir();
        const zipPath = await createZipFile(projectPath, projectName, outputsDir);
        const zipStats = fs.statSync(zipPath);
        const zipSizeMB = (zipStats.size / 1024 / 1024).toFixed(2);
        const zipFilename = path.basename(zipPath);

        return {
            outputJson: {
                projectName,
                filesGenerated: Object.keys(generatedProject.files).length,
                zipSizeMB,
                downloadUrl: `/api/download?file=${zipFilename}`,
                instructions: {
                    step1: "Download the ZIP file",
                    step2: "Unzip into your working directory",
                    step3: "Run: docker-compose up"
                }
            },
            summaryMarkdown: `## 🎉 Code Generated Successfully\n\n**Project:** \`${projectName}\`\n**Files:** ${Object.keys(generatedProject.files).length}\n**Size:** ${zipSizeMB} MB`,
            todoMarkdown: `- [ ] Download zip\n- [ ] Unzip\n- [ ] Run docker-compose up`
        };

    } catch (error) {
        console.error('[Lucas] ❌ Error during code generation:', error);
        throw { ok: false, error: "Code generation failed", details: error.message, status: 500 };
    }
}

/**
 * Helpers
 */
function sanitizeProjectName(mission) {
    return mission.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 50) || 'generated-app';
}

async function createPhysicalProject(generatedProject, projectName) {
    const timestamp = Date.now();
    const tempDir = os.tmpdir();
    const projectDir = path.join(tempDir, `factory-gen-${projectName}-${timestamp}`);

    if (!fs.existsSync(projectDir)) fs.mkdirSync(projectDir, { recursive: true });

    for (const [filePath, content] of Object.entries(generatedProject.files)) {
        const fullPath = path.join(projectDir, filePath);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(fullPath, content, 'utf8');
    }
    return projectDir;
}

async function createZipFile(projectPath, projectName, outputsDir) {
    const timestamp = Date.now();
    const zipName = `${projectName}-${timestamp}.zip`;
    const zipPath = path.join(outputsDir, zipName);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        output.on('close', () => resolve(zipPath));
        archive.on('error', (err) => reject(err));
        archive.pipe(output);
        archive.directory(projectPath, false);
        archive.finalize();
    });
}
