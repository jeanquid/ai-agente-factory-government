import { GoogleGenerativeAI } from "@google/generative-ai";
import archiver from 'archiver';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Lucas - The Builder
 * Generates functional code from the specifications provided by other agents.
 */

export async function generateProjectCode(specs, projectName = 'generated-app') {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

    const genAI = new GoogleGenerativeAI(apiKey);

    // Consolidate specifications from all agents
    const consolidatedSpecs = {
        productRequirements: specs.javier?.outputJson || {},
        dataArchitecture: specs.fabricio?.outputJson || {},
        systemArchitecture: specs.martin?.outputJson || {},
        securityRequirements: specs.damian?.outputJson || {},
        qualityStandards: specs.agustina?.outputJson || {}
    };

    console.log('[Lucas] Consolidating specifications from all agents...');
    console.log('[Lucas] Generating project structure...');

    // File structure to generate
    const filesToGenerate = [
        // Frontend
        { path: 'frontend/package.json', type: 'config' },
        { path: 'frontend/tsconfig.json', type: 'config' },
        { path: 'frontend/next.config.js', type: 'config' },
        { path: 'frontend/tailwind.config.js', type: 'config' },
        { path: 'frontend/src/app/page.tsx', type: 'component' },
        { path: 'frontend/src/app/layout.tsx', type: 'component' },
        { path: 'frontend/src/components/Header.tsx', type: 'component' },
        { path: 'frontend/src/lib/api.ts', type: 'service' },

        // Backend
        { path: 'backend/package.json', type: 'config' },
        { path: 'backend/tsconfig.json', type: 'config' },
        { path: 'backend/src/server.ts', type: 'code' },
        { path: 'backend/src/routes/index.ts', type: 'code' },
        { path: 'backend/src/controllers/mainController.ts', type: 'code' },
        { path: 'backend/src/models/index.ts', type: 'code' },
        { path: 'backend/src/middleware/auth.ts', type: 'code' },

        // Database
        { path: 'database/schema.sql', type: 'sql' },
        { path: 'database/seed.sql', type: 'sql' },

        // Root
        { path: 'docker-compose.yml', type: 'config' },
        { path: '.env.example', type: 'config' },
        { path: 'README.md', type: 'docs' },
        { path: 'DEPLOYMENT.md', type: 'docs' }
    ];

    // Generate each file using Gemini
    const generatedFiles = {};

    for (const file of filesToGenerate) {
        console.log(`[Lucas] Generating ${file.path}...`);

        const content = await generateFileContent(genAI, file, consolidatedSpecs, projectName);
        generatedFiles[file.path] = content;
    }

    console.log('[Lucas] All files generated successfully');

    return {
        files: generatedFiles,
        projectName,
        structure: filesToGenerate.map(f => f.path)
    };
}

async function generateFileContent(genAI, file, specs, projectName) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.2, // Low for consistent code generation
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 4096,
        }
    });

    const prompt = createPromptForFile(file, specs, projectName);

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let content = response.text();

        // Clean markdown fences
        content = content.replace(/```[a-z]*\n?/g, '').replace(/```\n?/g, '').trim();

        return content;
    } catch (error) {
        console.error(`[Lucas] Error generating ${file.path}:`, error.message);
        return getDefaultContent(file, projectName);
    }
}

function createPromptForFile(file, specs, projectName) {
    const basePrompt = `Generate ONLY the file content for: ${file.path}

Project: ${projectName}
Type: ${file.type}

Specifications:
${JSON.stringify(specs, null, 2)}

Requirements:
- Output ONLY the file content
- NO explanations, NO markdown fences
- Follow best practices for ${file.type}
- Use TypeScript where applicable
- Include proper error handling
- Add helpful comments

`;

    // Specific prompts per file path
    switch (file.path) {
        case 'frontend/package.json':
            return basePrompt + `
Create a Next.js 14 package.json with:
- TypeScript
- Tailwind CSS
- Essential dependencies for a modern web app
`;

        case 'backend/package.json':
            return basePrompt + `
Create a Node.js backend package.json with:
- Express
- TypeScript
- PostgreSQL client (pg)
- dotenv
- cors
- JWT for auth
`;

        case 'database/schema.sql':
            return basePrompt + `
Create PostgreSQL schema based on the data architecture specs.
Include:
- Users table with authentication fields
- Main business entities from specs
- Proper indexes
- Foreign keys
- Created_at/Updated_at timestamps
`;

        case 'docker-compose.yml':
            return basePrompt + `
Create docker-compose with:
- Frontend service (Next.js on port 3000)
- Backend service (Node.js on port 4000)
- PostgreSQL database (port 5432)
- Proper volumes and networks
`;

        case 'README.md':
            return basePrompt + `
Create a comprehensive README with:
- Project description
- Features list
- Quick start (3 steps max)
- Tech stack
- Environment variables needed
- How to run with Docker
- How to run without Docker
- API endpoints overview
`;

        default:
            return basePrompt;
    }
}

function getDefaultContent(file, projectName) {
    // Basic fallback if Gemini fails
    const defaults = {
        'README.md': `# ${projectName || 'Generated Application'}

## Quick Start

\`\`\`bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Run with Docker
docker-compose up
\`\`\`

## Tech Stack
- Frontend: Next.js 14 + TypeScript
- Backend: Node.js + Express
- Database: PostgreSQL

Visit http://localhost:3000 after starting.
`,
        '.env.example': `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API
API_PORT=4000
JWT_SECRET=your-secret-key-change-in-production

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:4000
`,
    };

    return defaults[file.path] || `// ${file.path}\n// Generated file\n`;
}

/**
 * Packages the generated files into a .zip
 */
export async function packageProject(files, projectName, outputPath) {
    if (!existsSync(outputPath)) {
        mkdirSync(outputPath, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        const zipPath = join(outputPath, `${projectName}.zip`);
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
            console.log(`[Lucas] Project packaged: ${archive.pointer()} bytes`);
            resolve(zipPath);
        });

        archive.on('error', (err) => {
            reject(err);
        });

        archive.pipe(output);

        // Add each file to the zip
        for (const [filePath, content] of Object.entries(files)) {
            archive.append(content, { name: filePath });
        }

        archive.finalize();
    });
}
