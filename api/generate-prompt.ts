
import { GoogleGenAI } from "@google/genai";
import { agents, governanceRules as defaultRules } from './data';
import { GeneratePromptRequest, GeneratePromptResponse } from './types';
import { IncomingMessage, ServerResponse } from 'http';

// Polyfill for Vercel Request helper types since we might not have @vercel/node user-side
interface VercelRequest extends IncomingMessage {
    body: any;
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
    // CORS configuration
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { agentId, tenantId, mission, governanceRules } = req.body as GeneratePromptRequest;

    // Audit Log: Request Received
    const startTime = new Date();
    console.log(JSON.stringify({
        level: 'info',
        message: 'Request received',
        timestamp: startTime.toISOString(),
        agentId,
        tenantId,
        path: '/api/generate-prompt'
    }));

    // Validation
    if (!agentId) {
        return res.status(400).json({ ok: false, error: 'Missing agentId' });
    }

    const agent = agents.find(a => a.id === agentId);
    if (!agent) {
        return res.status(404).json({ ok: false, error: `Agent '${agentId}' not found` });
    }

    // Use provided rules or default
    const rulesToUse = governanceRules || defaultRules;

    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

        if (!apiKey) {
            console.error("Missing GEMINI_API_KEY or GOOGLE_API_KEY env var");
            return res.status(500).json({ ok: false, error: 'Server configuration error: Missing API Key' });
        }

        const ai = new GoogleGenAI({ apiKey });

        const effectiveMission = mission || agent.mission;

        const systemInstruction = `
      Eres el Arquitecto Principal de una 'Fábrica de Agentes de IA' de nivel empresarial.
      Tu tarea es generar el SYSTEM PROMPT (Instrucción del Sistema) técnico y riguroso para configurar un LLM como el agente especificado a continuación.
      
      REGLAS DE GENERACIÓN:
      1. Idioma: Español.
      2. Tono: Autoritario, Profesional, Estricto.
      3. Formato: Markdown limpio y estructurado.
      4. El prompt resultante debe hablarle al agente en segunda persona ("Tú eres...").
      5. Debes incorporar explícitamente las reglas de gobierno global como restricciones duras.
      
      ESTRUCTURA DEL SYSTEM PROMPT A GENERAR:
      ### IDENTITY
      [Definición clara del rol y la misión]
      
      ### STRICT BOUNDARIES (CRITICAL)
      [Lista de lo que NO debe hacer, basado en 'Out of Scope' y reglas de gobierno]
      
      ### CORE CAPABILITIES & TOOLS
      [Qué puede hacer y qué entradas espera]
      
      ### OPERATIONAL PROTOCOL
      [Procedimiento paso a paso para ejecutar sus tareas]
      
      ### QUALITY GATE & SELF-CORRECTION
      [Checklist que debe verificar internamente antes de responder]
      
      ### OUTPUT FORMATTING
      [Estructura exacta de los entregables]
      
      ---
      
      DATOS DEL AGENTE:
      ${JSON.stringify({ ...agent, mission: effectiveMission }, null, 2)}
      
      REGLAS DE GOBIERNO GLOBAL:
      ${JSON.stringify(rulesToUse, null, 2)}
    `;

        const modelName = 'gemini-2.5-flash-latest';

        // Call Gemini API
        const response = await ai.models.generateContent({
            model: modelName,
            contents: systemInstruction, // Using string as per existing pattern
        });

        const text = response.text; // Accessing text property as per existing pattern

        if (!text) {
            throw new Error("No text generated from Gemini");
        }

        // Audit Log: Success
        console.log(JSON.stringify({
            level: 'info',
            message: 'Prompt generated successfully',
            agentId,
            model: modelName,
            timestamp: new Date().toISOString()
        }));

        const result: GeneratePromptResponse = {
            ok: true,
            promptMarkdown: text,
            meta: {
                agentId,
                model: modelName,
                createdAt: new Date().toISOString()
            }
        };

        res.status(200).json(result);

    } catch (error: any) {
        console.error(JSON.stringify({
            level: 'error',
            message: 'Generation failed',
            error: error.message,
            stack: error.stack
        }));

        res.status(500).json({
            ok: false,
            error: error.message || 'Internal Server Error'
        });
    }
}
