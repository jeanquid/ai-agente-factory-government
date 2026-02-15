import { GoogleGenerativeAI } from "@google/generative-ai";
import { agents } from './_data.js';
import { generateProjectCode } from './_code-generator.js';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import os from 'os';

// Configuration: Updated for Senior Backend Requirements (2025-2026)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Conservative list likely to exist for generateContent
const FALLBACK_MODELS = [
    "gemini-2.5-pro",
    "gemini-flash",
    "gemini-pro",
    "gemini-2.5-flash-lite"
];

/**
 * Executes a prompt against Gemini with automatic fallback to secondary models
 * if the primary one returns a 404 (Not Found) error.
 * Includes senior-level error classification for 401, 403, 429.
 */
async function generateWithFallback(genAI, systemPrompt) {
    const tryModel = async (modelName) => {
        console.log(`[Gemini] Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 8192,
            }
        });
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        return response.text();
    };

    const modelsToTry = Array.from(new Set([PRIMARY_MODEL, ...FALLBACK_MODELS]));
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
                console.error(`[Gemini] Authentication/Permission Error: ${message}`);
                throw { ok: false, error: "API key / permissions / region error", details: message, status: 403 };
            }

            // 2. Quota / Rate Limit (429)
            if (status === 429 || message.includes("429") || message.includes("quota") || message.includes("limit")) {
                console.error(`[Gemini] Quota/Rate Limit Error: ${message}`);
                throw { ok: false, error: "Quota / rate limit error", details: message, status: 429 };
            }

            // 3. Not Found / Not Supported (404) -> Fallback
            if (status === 404 || message.includes("404") || message.includes("not found") || message.includes("not supported") || message.includes("Model not found")) {
                console.warn(`[Gemini] Model '${modelName}' not found or unsupported. Trying next fallback...`);
                lastError = { model: modelName, message };
                continue;
            }

            // 4. Other Errors
            console.error(`[Gemini] Unexpected error with model ${modelName}:`, message);
            throw { ok: false, error: "Model execution failed", details: message, status: 500 };
        }
    }

    // If we exhausted all models
    throw {
        ok: false,
        error: "All models failed (Not Found / Unsupported)",
        details: lastError ? `Last tried ${lastError.model}: ${lastError.message}` : "No fallbacks succeeded",
        status: 404
    };
}

export async function executeAgent(agentId, runState, previousSteps) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    // SPECIAL HANDLING FOR LUCAS - CODE GENERATION
    if (agentId === 'lucas') {
        console.log('[Lucas] 🏗️ Code generation agent detected');
        return await executeLucasCodeGeneration(runState, previousSteps);
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Construct context
    // Construct context
    const context = previousSteps.map(step => ({
        agentId: step.agentId,
        role: agents.find(a => a.id === step.agentId)?.role,
        output: step.deliverables?.outputJson,
        summary: step.deliverables?.summaryMarkdown,
        todo: step.deliverables?.todoMarkdown
    }));

    const systemPrompt = `
You are ${agent.name}, acting as ${agent.role}.
Your mission is: ${runState.mission}.

GOAL:
Execute your specific tasks as part of this mission, building upon the work of previous agents.

CONTEXT FROM PREVIOUS AGENTS:
${JSON.stringify(context, null, 2)}

YOUR AGENT PROFILE:
${JSON.stringify(agent, null, 2)}

CRITICAL OUTPUT REQUIREMENTS - READ CAREFULLY:

You MUST respond with ONLY a valid JSON object. Your response must:
1. Start with { and end with }
2. Contain NO text before or after the JSON
3. Contain NO markdown code fences (no \`\`\`json or \`\`\`)
4. Contain NO explanations or commentary
5. Be valid, parseable JSON

The JSON object MUST contain these three keys (all required):

{
  "outputJson": {
    // Structured object with your work artifacts/data
  },
  "summaryMarkdown": "Executive summary in Markdown with ## headers",
  "todoMarkdown": "Actionable steps:\\n- Item 1\\n- Item 2"
}

EXAMPLE VALID RESPONSE:
{
  "outputJson": {
    "projectName": "Meteorite Tracker",
    "features": ["Real-time tracking", "Historical data"],
    "techStack": ["React", "Node.js"]
  },
  "summaryMarkdown": "## Analysis\\n\\nComprehensive meteorite tracking app plan.",
  "todoMarkdown": "- Setup environment\\n- Create schema\\n- Build API"
}

Execute your role as ${agent.name} and respond with the JSON object.
`;

    try {
        // Execute with fallback logic
        const text = await generateWithFallback(genAI, systemPrompt);

        if (!text) throw new Error("No content generated from Gemini");

        console.log(`[Agent Runner] Raw response from ${agentId}:`, text.substring(0, 500) + (text.length > 500 ? "..." : ""));

        // Robust JSON extraction
        let jsonText = text.trim();
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        } else {
            // Fallback: try removing markdown code blocks if the brace logic failed
            jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(jsonText);
        } catch (parseError) {
            console.error("[Agent Runner] JSON Parse Error. Extracted text:", jsonText);
            throw new Error(`Failed to parse agent response as JSON: ${parseError.message}`);
        }

        // Flexible Key Matching (Senior Backend Resilience)
        // Some models might rename keys despite instructions
        const getVal = (keys) => {
            const foundKey = keys.find(k => typeof parsed[k] !== 'undefined');
            return foundKey ? parsed[foundKey] : undefined;
        };

        const outputJson = getVal(['outputJson', 'output', 'artifacts', 'data', 'result']);
        const summaryMarkdown = getVal(['summaryMarkdown', 'summary', 'executiveSummary', 'description']);
        const todoMarkdown = getVal(['todoMarkdown', 'todo', 'todos', 'nextSteps', 'actionItems', 'risks']);

        // Validation
        if (typeof outputJson === 'undefined' || typeof summaryMarkdown === 'undefined' || typeof todoMarkdown === 'undefined') {
            console.error("[Agent Runner] Validation Failed. Parsed keys:", Object.keys(parsed));
            throw {
                ok: false,
                error: "Agent response format invalid",
                details: "Response missing required fields (outputJson, summaryMarkdown, todoMarkdown). Found: " + Object.keys(parsed).join(', '),
                status: 500
            };
        }

        return {
            outputJson,
            summaryMarkdown: String(summaryMarkdown),
            todoMarkdown: String(todoMarkdown)
        };

    } catch (error) {
        console.error(`[Agent Runner] Error executing agent ${agentId}:`, error);

        // If it's already a structured error, rethrow it
        if (error.ok === false) throw error;

        // Otherwise, wrap it
        throw {
            ok: false,
            error: "Agent execution failed",
            details: error.message || String(error),
            status: 500
        };
    }
}

/**
 * Lucas - The Builder
 * Generates executable code from specifications
 */
async function executeLucasCodeGeneration(runState, previousSteps) {
    console.log('[Lucas] 🚀 Starting project generation...');

    try {
        // 1. Consolidate outputs of previous agents
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

        console.log('[Lucas] ✅ Specs consolidated from:', Object.keys(specs).join(', '));

        // 2. Generate code
        const projectName = sanitizeProjectName(runState.mission);
        console.log(`[Lucas] 📝 Generating project: ${projectName}...`);

        const generatedProject = await generateProjectCode(specs, projectName);
        console.log(`[Lucas] ✅ Generated ${Object.keys(generatedProject.files).length} files`);

        // 3. Create physical files temporarily
        const projectPath = await createPhysicalProject(generatedProject, projectName);
        console.log(`[Lucas] ✅ Project created at: ${projectPath}`);

        // 4. Create ZIP
        // We save it in a public/outputs folder so the frontend can serve it
        const outputsDir = path.join(process.cwd(), 'public', 'outputs');
        if (!fs.existsSync(outputsDir)) {
            fs.mkdirSync(outputsDir, { recursive: true });
        }

        const zipPath = await createZipFile(projectPath, projectName, outputsDir);
        console.log(`[Lucas] ✅ Project zipped: ${zipPath}`);

        const zipStats = fs.statSync(zipPath);
        const zipSizeMB = (zipStats.size / 1024 / 1024).toFixed(2);
        const zipFilename = path.basename(zipPath);

        // 5. Return in standard format
        return {
            outputJson: {
                projectName,
                filesGenerated: Object.keys(generatedProject.files).length,
                zipPath: zipPath,
                zipSize: zipStats.size,
                zipSizeMB,
                structure: generatedProject.structure,
                downloadUrl: `/outputs/${zipFilename}`,
                instructions: {
                    step1: "Download the ZIP file",
                    step2: "Unzip into your working directory",
                    step3: "Read the README.md",
                    step4: "Run: docker-compose up",
                    step5: "Open http://localhost:3000"
                }
            },
            summaryMarkdown: `## 🎉 Code Generated Successfully

**Project:** \`${projectName}\`  
**Files:** ${Object.keys(generatedProject.files).length} files generated  
**ZIP Size:** ${zipSizeMB} MB

### 📦 Project Content:

#### Frontend (Next.js + TypeScript)
- ✅ React pages and components
- ✅ API services
- ✅ Tailwind CSS configuration

#### Backend (Express + TypeScript)  
- ✅ REST API with routes
- ✅ Controllers and models
- ✅ Authentication middleware

#### Database (PostgreSQL)
- ✅ SQL Schema implemented
- ✅ Initial data seeds

#### DevOps
- ✅ Docker Compose setup
- ✅ Environment variables configured
- ✅ README with full instructions

### 🚀 How to Use Your Project:

1. **Download** the ZIP file
2. **Unzip** on your computer
3. **Read** the complete \`README.md\`
4. **Install Docker** if you don't have it installed
5. **Run:** \`docker-compose up\`
6. **Open** http://localhost:3000 in your browser

Your application will be running locally in minutes! 🚀`,

            todoMarkdown: `- [ ] **Download** the project ZIP file (${zipSizeMB} MB)
- [ ] **Unzip** into your working directory
- [ ] **Read** the complete \`README.md\`
- [ ] **Verify** that you have Docker installed
- [ ] **Run** \`docker-compose up\` in the project root
- [ ] **Open** http://localhost:3000 in your browser
- [ ] **Explore** the source code
- [ ] **Customize** components according to your brand
- [ ] **Configure** environment variables for production
- [ ] **Test** all main functionalities
- [ ] **Deploy** to your preferred platform
- [ ] **Share** your new app with users! 🎉`
        };

    } catch (error) {
        console.error('[Lucas] ❌ Error during code generation:', error);
        throw new Error(`Code generation failed: ${error.message}`);
    }
}

/**
 * Helper: Sanitize project name
 */
function sanitizeProjectName(mission) {
    return mission
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) || 'generated-app';
}

/**
 * Helper: Create physical project files
 */
async function createPhysicalProject(generatedProject, projectName) {
    const timestamp = Date.now();
    const tempDir = os.tmpdir();
    const projectDir = path.join(tempDir, `factory-gen-${projectName}-${timestamp}`);

    console.log(`[Lucas] Creating project directory: ${projectDir}`);

    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
    }

    // Create all files
    for (const [filePath, content] of Object.entries(generatedProject.files)) {
        const fullPath = path.join(projectDir, filePath);
        const dir = path.dirname(fullPath);

        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(fullPath, content, 'utf8');
    }

    return projectDir;
}

/**
 * Helper: Create ZIP file
 */
async function createZipFile(projectPath, projectName, outputsDir) {
    const timestamp = Date.now();
    const zipName = `${projectName}-${timestamp}.zip`;
    const zipPath = path.join(outputsDir, zipName);

    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });

        output.on('close', () => {
            const sizeKB = (archive.pointer() / 1024).toFixed(2);
            console.log(`[Lucas] ZIP created: ${sizeKB} KB total`);
            resolve(zipPath);
        });

        archive.on('error', (err) => {
            console.error('[Lucas] ZIP error:', err);
            reject(err);
        });

        archive.pipe(output);
        archive.directory(projectPath, false);
        archive.finalize();
    });
}
