export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', "true");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.statusCode = 200;
        res.end();
        return;
    }

    if (!apiKey) {
        return res.status(500).json({
            ok: false,
            error: "Missing GEMINI_API_KEY env var",
            details: "Please set GEMINI_API_KEY in your Vercel/Environment settings."
        });
    }

    try {
        // Fetch models from Gemini API
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (!resp.ok) {
            throw new Error(data.error?.message || `Gemini API returned ${resp.status}`);
        }

        // Filter for models that support generateContent
        const supportedModels = (data.models || [])
            .filter(m => m.supportedGenerationMethods.includes("generateContent"))
            .map(m => ({
                id: m.name.split('/').pop(),
                name: m.name,
                displayName: m.displayName,
                description: m.description,
                capabilities: m.supportedGenerationMethods
            }));

        res.status(200).json({
            ok: true,
            count: supportedModels.length,
            recommended_model: "gemini-2.5-flash",
            env_configured_model: process.env.GEMINI_MODEL || "not set",
            models: supportedModels
        });

    } catch (error) {
        console.error("[Debug Models] Error:", error);
        res.status(500).json({
            ok: false,
            error: "Failed to fetch available models",
            details: error.message
        });
    }
}
