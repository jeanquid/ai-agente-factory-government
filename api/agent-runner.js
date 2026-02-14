import { GoogleGenerativeAI } from "@google/generative-ai";
import { agents } from './data.js';

export async function executeAgent(agentId, runState, previousSteps) {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash for speed and cost, or pro for reasoning
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

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
    You must return a SINGLE JSON object. No markdown formatting around it (i.e. DO NOT wrap with \`\`\`json).
    The keys must be:
    - "outputJson": A structured object containing the artifacts/data you produced.
    - "summaryMarkdown": A clear, executive summary of what you did and your findings (in Markdown).
    - "nextSuggestions": An array of strings with suggestions for the next steps or agents.
    
    Ensure "outputJson" is rich and detailed, matching your capabilities (e.g., if you are a Legal agent, provide clauses; if Security, provide vulnerability assessment).
    `;

    try {
        const result = await model.generateContent(systemPrompt);
        const response = await result.response;
        const text = response.text();

        if (!text) throw new Error("No content generated");

        // Clean up markdown code blocks if the model ignored instructions
        let jsonText = text.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json/, '').replace(/```$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```/, '').replace(/```$/, '');
        }

        const parsed = JSON.parse(jsonText);

        // Basic validation
        if (typeof parsed.outputJson === 'undefined' || typeof parsed.summaryMarkdown === 'undefined') {
            throw new Error("Response missing required fields (outputJson, summaryMarkdown)");
        }

        return {
            outputJson: parsed.outputJson,
            summaryMarkdown: parsed.summaryMarkdown,
            nextSuggestions: parsed.nextSuggestions || []
        };

    } catch (error) {
        console.error("Agent execution failed:", error);
        throw new Error(`Agent execution failed: ${error.message}`);
    }
}
