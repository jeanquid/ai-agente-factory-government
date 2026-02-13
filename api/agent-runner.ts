
import { GoogleGenAI } from "@google/genai";
import { agents } from './data';
import { RunState, RunStep } from './types';

export async function executeAgent(
    agentId: string,
    runState: RunState,
    previousSteps: RunStep[]
): Promise<{ outputJson: any; summaryMarkdown: string; nextSuggestions: string[] }> {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const ai = new GoogleGenAI({ apiKey });

    // Construct context from previous steps to inform the current agent
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
    
    CONTEXT FROM PREVIOUS AGENTS (Input for you):
    ${JSON.stringify(context, null, 2)}
    
    YOUR AGENT PROFILE:
    ${JSON.stringify(agent, null, 2)}
    
    OUTPUT REQUIREMENTS:
    You must return a SINGLE JSON object. No markdown formatting around it.
    The keys must be:
    - "outputJson": A structured object containing the artifacts/data you produced.
    - "summaryMarkdown": A clear, executive summary of what you did and your findings (in Markdown).
    - "nextSuggestions": An array of strings with suggestions for the next steps or agents.
    
    Ensure "outputJson" is rich and detailed, matching your capabilities (e.g., if you are a Legal agent, provide clauses; if Security, provide vulnerability assessment).
    `;

    // Use a model known for good JSON following. 
    // If the user's environment supports gemini-1.5-flash or pro, use that.
    const modelId = 'gemini-1.5-flash';

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
            },
            contents: [
                { role: 'user', parts: [{ text: systemPrompt }] }
            ]
        });

        const text = response.text;
        if (!text) throw new Error("No content generated");

        const parsed = JSON.parse(text);

        // Basic validation
        if (typeof parsed.outputJson === 'undefined' || typeof parsed.summaryMarkdown === 'undefined') {
            throw new Error("Response missing required fields (outputJson, summaryMarkdown)");
        }

        return {
            outputJson: parsed.outputJson,
            summaryMarkdown: parsed.summaryMarkdown,
            nextSuggestions: parsed.nextSuggestions || []
        };

    } catch (error: any) {
        console.error("Agent execution failed:", error);
        throw new Error(`Agent execution failed: ${error.message}`);
    }
}
