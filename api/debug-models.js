
export default async function handler(req, res) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        return res.status(500).json({
            ok: false,
            error: "Missing GEMINI_API_KEY env var"
        });
    }

    try {
        // Try v1beta (most comprehensive list)
        const urlBeta = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const respBeta = await fetch(urlBeta);
        const dataBeta = await respBeta.json();

        // Try v1 (stable)
        const urlV1 = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
        const respV1 = await fetch(urlV1);
        const dataV1 = await respV1.json();

        res.status(200).json({
            ok: true,
            env_model: process.env.GEMINI_MODEL || "(not set, using default)",
            sdk_version: "0.12.0+",
            v1beta_models: dataBeta.models || dataBeta,
            v1_models: dataV1.models || dataV1
        });

    } catch (error) {
        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
}
