<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AI Agent Factory - v3.1 (Manual Flow + In-Memory)

This version implements a **manual "Read & Continue" workflow** where each step produces concrete deliverables (JSON, Summary, Todo) and a downloadable PDF report.

**IMPORTANT:** This version uses an **In-Memory Store** for simplicity and speed.
- **Run data is lost on server restart (cold boot) or redeploy.**
- Ideal for quick demos or single-session use.

## New Features (v3.1)
- **Manual Gates:** Users must confirm "I have read the documents" before proceeding to the next agent.
- **PDF Generation:** On-demand generation of step reports (`step-01-javier.pdf`).
- **Strict Deliverables:** Every step guarantees `outputJson`, `summaryMarkdown` and `todoMarkdown`.

## Run Locally

**Prerequisites:** Node.js (v18+).

1. **Install dependencies:**
   ```bash
   npm install
   ```
   *Note: Includes `pdfkit` for PDF generation.*

2. **Environment Setup:**
   Create `.env.local`:
   ```bash
   GEMINI_API_KEY=your_gemini_api_key
   GEMINI_MODEL=gemini-2.5-flash # Optional, default
   ```

3. **Run the app:**
   ```bash
   npm run dev
   # or
   npx vercel dev
   ```

## API Usage

### 1. Start a Run
**Endpoint:** `POST /api/runs/start`
**Body:**
```json
{
  "mission": "Create a Legal Agent for contract review"
}
```
**Returns:** `{ "ok": true, "runId": "uuid...", "state": {...} }`

### 2. Execute Specific Step
**Endpoint:** `POST /api/runs/:runId/steps/:step/execute`
**Description:** Triggers the AI agent for that step.
**Returns:**
```json
{
  "ok": true,
  "state": {...},
  "deliverables": { "outputJson":..., "summaryMarkdown":..., "todoMarkdown":... },
  "pdfUrl": "/api/runs/:runId/steps/:step/pdf"
}
```

### 3. Generate PDF
**Endpoint:** `GET /api/runs/:runId/steps/:step/pdf`
**Returns:** `application/pdf` binary stream.

### 4. Confirm Read
**Endpoint:** `POST /api/runs/:runId/steps/:step/confirm-read`
**Body:** `{ "read": true }`
**Description:** Unlocks the next step in the workflow.

## Testing with Curl

**Start Run:**
```bash
curl -X POST http://localhost:3000/api/runs/start \
  -H "Content-Type: application/json" \
  -d '{"mission": "Test Run"}'
```

**Execute Step 1 (Replace RUN_ID):**
```bash
curl -X POST http://localhost:3000/api/runs/RUN_ID_HERE/steps/1/execute
```

**Download PDF:**
```bash
curl -O http://localhost:3000/api/runs/RUN_ID_HERE/steps/1/pdf
```

**Confirm Read:**
```bash
curl -X POST http://localhost:3000/api/runs/RUN_ID_HERE/steps/1/confirm-read \
  -H "Content-Type: application/json" \
  -d '{"read": true}'
```
