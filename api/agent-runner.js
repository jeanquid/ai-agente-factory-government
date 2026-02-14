import { GoogleGenerativeAI } from "@google/generative-ai";
import { agents } from './data.js';

// Configuration
const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-1.5-flash";
const FALLBACK_MODEL = "gemini-pro"; // Stable fallback v1 (often redirects to 1.0-pro)

/**
 * Executes a prompt against Gemini with automatic fallback to a secondary model 
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
            const errObj = { model: modelName, originalError: error };
            throw errObj;
        }
    };

    try {
        return await tryModel(PRIMARY_MODEL);
    } catch (err) {
        // Build error message safely
        const errorMsg = err.originalError?.message || String(err.originalError);
        const isNotFound = errorMsg.includes("not found") || errorMsg.includes("404");

        if (isNotFound && PRIMARY_MODEL !== FALLBACK_MODEL) {
            console.warn(`[Gemini] Primary model '${PRIMARY_MODEL}' failed (404). Switching to fallback: '${FALLBACK_MODEL}'`);
            try {
                return await tryModel(FALLBACK_MODEL);
            } catch (fallbackErr) {
                const fbErrorMsg = fallbackErr.originalError?.message || String(fallbackErr.originalError);
                throw new Error(`Gemini Fallback Failed after Primary failed. Primary Error: ${errorMsg}. Fallback Error: ${fbErrorMsg}`);
            }
        }
        // Rethrow original if not a 404 or if models are same
        throw err.originalError;
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
