import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-AI-Model'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ ok: false, message: 'Method not allowed' });
    }

    try {
        const { model } = req.body;

        if (!model) {
            return res.status(400).json({
                ok: false,
                message: 'Model parameter required'
            });
        }

        console.log(`[Test Model] Testing: ${model}`);

        // Handle Claude models
        if (model.startsWith('claude-')) {
            const anthropicKey = process.env.ANTHROPIC_API_KEY;
            if (!anthropicKey) {
                return res.status(200).json({
                    ok: false,
                    message: 'ANTHROPIC_API_KEY not configured'
                });
            }

            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': anthropicKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: model,
                    max_tokens: 50,
                    messages: [{ role: 'user', content: 'Say OK' }]
                })
            });

            if (!response.ok) {
                const error = await response.text();
                return res.status(200).json({
                    ok: false,
                    message: `Claude error: ${error.substring(0, 100)}`
                });
            }

            return res.status(200).json({
                ok: true,
                message: 'Claude connection successful',
                model: model
            });
        }

        // Handle Gemini models
        const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
        if (!geminiKey) {
            return res.status(200).json({
                ok: false,
                message: 'GEMINI_API_KEY not configured'
            });
        }

        const genAI = new GoogleGenerativeAI(geminiKey);
        const aiModel = genAI.getGenerativeModel({ model });

        const result = await aiModel.generateContent('Say OK');
        const response = await result.response;
        const text = response.text();

        if (!text) {
            return res.status(200).json({
                ok: false,
                message: 'Model returned empty response'
            });
        }

        console.log(`[Test Model] ✅ ${model} works`);

        return res.status(200).json({
            ok: true,
            message: 'Connection successful',
            model: model,
            response: text.substring(0, 50)
        });

    } catch (error) {
        console.error('[Test Model] Error:', error);

        const message = error.message || String(error);

        // Detect specific errors
        if (message.includes('404') || message.includes('not found')) {
            return res.status(200).json({
                ok: false,
                message: 'Model not found or not available'
            });
        }

        if (message.includes('429') || message.includes('quota') || message.includes('limit')) {
            return res.status(200).json({
                ok: false,
                message: 'Quota exceeded - try another model'
            });
        }

        if (message.includes('401') || message.includes('403') || message.includes('API key')) {
            return res.status(200).json({
                ok: false,
                message: 'API key invalid or missing'
            });
        }

        return res.status(200).json({
            ok: false,
            message: message.substring(0, 100)
        });
    }
}
