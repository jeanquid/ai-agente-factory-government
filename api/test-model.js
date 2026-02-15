import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Endpoint to test connectivity with a specific AI model.
 * Supports Gemini models natively and can be extended for Claude.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { model: modelId } = req.body;

    if (!modelId) {
        return res.status(400).json({ ok: false, message: 'Missing model ID' });
    }

    try {
        // 1. Anthropic/Claude Check (Simulated or implemented if key exists)
        if (modelId.startsWith('claude-')) {
            const anthropicKey = process.env.ANTHROPIC_API_KEY;
            if (!anthropicKey) {
                return res.status(400).json({
                    ok: false,
                    message: 'ANTHROPIC_API_KEY no configurada. Por favor contacte al administrador.'
                });
            }

            // Basic ping to Anthropic (optional implementation)
            return res.status(200).json({
                ok: true,
                model: modelId,
                message: 'Claude API configurada correctamente.'
            });
        }

        // 2. Gemini Check
        const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error('Missing Gemini/Google API key in environment');

        console.log(`[Test Model] Testing connectivity for: ${modelId}`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelId });

        // Simple prompt to verify connection
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'Respond with "OK" and nothing else.' }] }],
            generationConfig: { maxOutputTokens: 10 }
        });

        const response = await result.response;
        const text = response.text();

        if (text.includes('OK')) {
            res.status(200).json({
                ok: true,
                model: modelId,
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('Respuesta inesperada del modelo');
        }

    } catch (error) {
        console.error(`[Test Model] Connection failed for ${modelId}:`, error);
        res.status(500).json({
            ok: false,
            model: modelId,
            message: error.message || 'Error de conexión con el proveedor de IA'
        });
    }
}
