<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1wilgT1rcpQr7oJgxhRi0dDcHVj3q_U9O

## Run Locally

**Prerequisites:** Node.js (v18+ recommended), Vercel CLI (optional but recommended for backend)

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Setup:**
   - Create `.env.local` in the root.
   - Add your Gemini API Key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
   - *Note: This key is NOT exposed to the client. It is only used by the serverless function.*

3. **Run the app:**
   - **Option A (Recommended):** Use Vercel CLI to act as a full-stack environment.
     ```bash
     npx vercel dev
     ```
   - **Option B (Frontend Only):** 
     ```bash
     npm run dev
     ```
     *Note: API calls to /api/generate-prompt will fail unless you have a backend proxy configured.*

## Deployment (Vercel)

1. Push to GitHub.
2. Import project in Vercel.
3. Add Environment Variable `GEMINI_API_KEY` in Vercel Project Settings.
4. Deploy. Vercel will automatically detect the Vite frontend and `/api` serverless functions.

## API Usage

**Endpoint:** `POST /api/generate-prompt`

**Headers:** `Content-Type: application/json`

**Body:**
```json
{
  "agentId": "javier",
  "tenantId": "default",
  "mission": "Optional override mission",
  "governanceRules": [] // optional
}
```

**Test with Curl:**
```bash
curl -X POST http://localhost:3000/api/generate-prompt \
  -H "Content-Type: application/json" \
  -d '{"agentId": "javier", "tenantId": "default"}'
```
