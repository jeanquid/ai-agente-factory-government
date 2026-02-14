import { GoogleGenerativeAI } from "@google/generative-ai";
import { agents } from './_data.js';

// Configuration
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
// List of fallbacks to try in order
const FALLBACK_MODELS = [
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash-001",
    "gemini-1.0-pro",
    "gemini-pro",
    "gemini-1.0-pro-latest"
];

/**
 * Executes a prompt against Gemini with automatic fallback to secondary models
 * if the primary one returns a 404 (Not Found) error.
 */
async function generateWithFallback(genAI, systemPrompt) {
    const tryModel = async (modelName) => {
        console.log(`[Gemini] Attempting generation with model: ${modelName}`);
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            // Throw object to preserve context
            throw { model: modelName, originalError: error };
        }
    };

    // 1. Try Primary
    try {
        return await tryModel(PRIMARY_MODEL);
    } catch (err) {
        const errorMsg = err.originalError?.message || String(err.originalError);
        const isNotFound = errorMsg.includes("not found") || errorMsg.includes("404");

        // If not a 404 error (e.g. rate limit, quota, invalid API key), rethrow immediately
        if (!isNotFound) {
            console.error(`[Gemini] Primary model error (NON-404): ${errorMsg}`);
            throw err.originalError;
        }

        console.warn(`[Gemini] Primary model '${PRIMARY_MODEL}' failed (404/NotFound). Starting fallback chain...`);

        // 2. Try Fallbacks
        let lastError = err;
        for (const fallbackModel of FALLBACK_MODELS) {
            if (fallbackModel === PRIMARY_MODEL) continue; // Skip if same

            try {
                console.log(`[Gemini] Trying fallback: ${fallbackModel}`);
                return await tryModel(fallbackModel);
            } catch (fbErr) {
                console.warn(`[Gemini] Fallback '${fallbackModel}' failed.`);
                lastError = fbErr;
                // If this error is NOT a 404, we might want to stop trying? 
                // No, keep trying other models just in case.
                continue;
            }
        }

        // If all fail
        throw new Error(`All Gemini models failed. Last error from ${lastError.model}: ${lastError.originalError?.message || lastError}`);
    }
}

export async function executeAgent(agentId, runState, previousSteps) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Construct context
    const context = previousSteps.map(step => ({
        agentId: step.agentId,
        role: agents.find(a => a.id === step.agentId)?.role,
        output: step.outputJson,
        summary: step.summaryMarkdown
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
    - "nextSuggestions": An array of strings with suggestions for the next steps or agents.
    
    Ensure "outputJson" is rich and detailed, matching your capabilities.
    `;

    try {
        // Execute with fallback logic
        const text = await generateWithFallback(genAI, systemPrompt);

        if (!text) throw new Error("No content generated from Gemini");

        // Robust JSON extraction
        let jsonText = text.trim();
        const firstBrace = jsonText.indexOf('{');
        const lastBrace = jsonText.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            jsonText = jsonText.substring(firstBrace, lastBrace + 1);
        } else {
            // Fallback cleanup
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```/, '').replace(/```$/, '');
            }
        }

        const parsed = JSON.parse(jsonText);

        // Validation
        if (typeof parsed.outputJson === 'undefined' || typeof parsed.summaryMarkdown === 'undefined') {
            throw new Error("Response missing required fields (outputJson, summaryMarkdown)");
        }

        return {
            outputJson: parsed.outputJson,
            summaryMarkdown: parsed.summaryMarkdown,
            nextSuggestions: parsed.nextSuggestions || []
        };

    } catch (error) {
        console.error(`[Agent Runner] Error executing agent ${agentId}:`, error);
        throw new Error(`Agent execution failed: ${error.message}`);
    }
}
