<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Agent Factory - v3 (Drive Persistence Edition)

This version introduces a real execution pipeline where agents persist their state and artifacts to Google Drive, allowing for resumable runs and audit trails.

**View your app in AI Studio:** https://ai.studio/apps/drive/1wilgT1rcpQr7oJgxhRi0dDcHVj3q_U9O

## New Features (v3)
- **Real Pipeline:** Agents execute sequentially, passing context (JSON/Markdown) to the next agent.
- **Drive Storage:** No database. All state (`run.json`, `audit.jsonl`) and artifacts are stored in Google Drive.
- **Resumable Runs:** You can close the browser and resume any run by its ID.
- **Audit:** Full audit log of every step and error.

## Run Locally

**Prerequisites:** Node.js (v18+), Vercel CLI (recommended).

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Google Cloud Setup (Drive API):**
   - Go to Google Cloud Console.
   - Enable **Google Drive API**.
   - Create a **Service Account**.
   - Create a JSON Key for the Service Account and download it.
   - (Optional) Share a folder in your personal Drive with the Service Account email if you want to see the files easily, though the system will create its own 'AgentFactory' folder in the Service Account's drive.

3. **Environment Setup:**
   - Create `.env.local` in the root.
   - Add the following variables:
     ```bash
     GEMINI_API_KEY=your_gemini_api_key
     GOOGLE_SERVICE_ACCOUNT_JSON='{"type": "service_account", ...}' # The full JSON string of your key file
     GOOGLE_DRIVE_ROOT_FOLDER_NAME=AgentFactory
     ```
   - *Tip:* For `GOOGLE_SERVICE_ACCOUNT_JSON`, ensure the JSON is single-line or properly escaped if using `.env` files locally.

4. **Run the app:**
   - Use Vercel logic for API routes:
     ```bash
     npx vercel dev
     ```

## API Usage

### 1. Start a Run
**Endpoint:** `POST /api/runs/start`
**Body:**
```json
{
  "tenantId": "default",
  "mission": "Create a Legal Agent",
  "workflowOrder": ["javier", "fabricio", "martin", "damian", "agustina"]
}
```
**Returns:** `{ "ok": true, "runId": "uuid...", "state": {...} }`

### 2. Execute Next Step
**Endpoint:** `POST /api/runs/:runId/next`
**Returns:** `{ "ok": true, "state": {...}, "stepResult": {...} }`

### 3. Get Run State
**Endpoint:** `GET /api/runs/:runId`
**Returns:** `RunState` object.

## Testing with Curl

**Start Run:**
```bash
curl -X POST http://localhost:3000/api/runs/start \
  -H "Content-Type: application/json" \
  -d '{"mission": "Test Run", "workflowOrder": ["javier"]}'
```

**Run Next Step (replace RUN_ID):**
```bash
curl -X POST http://localhost:3000/api/runs/RUN_ID_HERE/next
```

**Check State:**
```bash
curl http://localhost:3000/api/runs/RUN_ID_HERE
```
