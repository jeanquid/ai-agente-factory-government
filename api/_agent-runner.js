import { GoogleGenerativeAI } from "@google/generative-ai";
import { agents } from './_data.js';

// Configuration: Updated for Senior Backend Requirements (2025-2026)
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// Conservative list likely to exist for generateContent
const FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite", // If available
    "gemini-2.5-pro"        // If available
];

/**
 * Executes a prompt against Gemini with automatic fallback to secondary models
 * if the primary one returns a 404 (Not Found) error.
 * Includes senior-level error classification for 401, 403, 429.
 */
async function generateWithFallback(genAI, systemPrompt) {
    const tryModel = async (modelName) => {
        console.log(`[Gemini] Attempting generation with model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });
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
    
    OUTPUT REQUIREMENTS:
    You must return a SINGLE JSON object. No markdown formatting around it (i.e. DO NOT wrap with \`\`\`json).
    The keys must be:
    - "outputJson": A structured object containing the artifacts/data you produced.
    - "summaryMarkdown": A clear, executive summary of what you did and your findings (in Markdown).
    - "todoMarkdown": A markdown list of actionable next steps, risks, or follow-up items.
    
    Ensure "outputJson" is rich and detailed, matching your capabilities.
    Ensure "todoMarkdown" is clear and actionable.
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
