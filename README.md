# LegacyMind AI

LegacyMind AI is an agent-style application modernization workspace for understanding and improving legacy systems. It turns application discovery data into evidence-based analysis, documentation, dependency maps, test insights, risk summaries, and modernization recommendations.

The product is built around a simple principle: understand the existing system before deciding how to replace or modernize it.

## What the application does

LegacyMind AI helps teams:

- Import application discovery data from an Excel workbook.
- Select and analyze individual applications.
- Identify critical findings, high-complexity modules, continuity risks, and test coverage gaps.
- Explore application structure, dependencies, cycles, and orphaned records.
- Generate functional documentation and process flows.
- Review parity test results and untested business rules.
- Ask questions through an AI assistant grounded in the selected application's analysis.
- Review evidence and traceability for findings, tests, and recommendations.
- Convert analysis into prioritized modernization recommendations and a NOW/NEXT/LATER roadmap.

The analysis engine uses deterministic rules for dataset-based findings. The AI service adds summaries, insights, assistant responses, and other contextual guidance based on the imported data.

## Requirements

- Node.js 22.5 or later. The backend uses Node's built-in SQLite support.
- npm.
- Access to the VW LLMaaS API and the required credentials. AI configuration is required for the application.

## Installation

From the repository root, install all workspace dependencies:

**Terminal 1 — Backend:**
```bash
cd apps/server
npm install (if this not works then run- npm install --no-package-lock)
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
npm install --no-package-lock
npm run dev
```

The repository uses npm workspaces for the server, web application, and shared package.

## Required AI configuration

Create a file named `.env` in `apps/server` and add the LLMaaS configuration supplied for your environment:

```env
AI_PROVIDER=llmaas
LLMAAS_CLIENT_ID=your-client-id
LLMAAS_CLIENT_SECRET=your-client-secret
LLMAAS_API_KEY=your-api-key
LLMAAS_TOKEN_URL=https://idp.cloud.vwgroup.com/auth/realms/kums-mfa/protocol/openid-connect/token
LLMAAS_BASE_URL=https://llmapi.ai.vwgroup.com
LLMAAS_MODEL=gpt-4o
LLMAAS_EMBEDDING_MODEL=text-embedding-3-large
PORT=3001
DB_PATH=./legacymind.db
```

The client ID, client secret, and API key must be valid for the LLMaaS environment. Do not commit `.env` files or expose these values in the frontend. The backend keeps credentials and OAuth access tokens server-side.

## Running the application

### Windows and cross-platform startup

From the repository root, run:

```bash
npm run dev
```

This starts both services:

- Web application: http://localhost:5173
- Backend API: http://localhost:3001

Open http://localhost:5173 in a browser.

### Starting the services separately

Backend:

```bash
cd apps/server
npm run dev
```

Frontend, in a second terminal:

```bash
cd apps/web
npm run dev
```

The `start.sh` script provides an equivalent combined startup flow for Linux and macOS environments with Bash. The Electron wrapper in `apps/desktop` is experimental and is not part of the supported application workflow.

## Using the application

1. Open the web application at http://localhost:5173.
2. Use Import Dataset to upload an `.xlsx` discovery workbook.
3. Select an application from the imported application list.
4. Select Analyze Application to generate its profile and analysis.
5. Review the available views:
   - Overview: executive summary, key metrics, findings, and recommendations.
   - Understand: application profile, modules, business rules, and findings.
   - Dependencies: dependency graph, cycles, and orphan records.
   - Documents: functional documentation and generated process flows.
   - Tests: parity results, mismatches, and untested critical rules.
   - Modernize: prioritized recommendations and roadmap phases.
   - Risks: risks grouped by category and severity.
   - Traceability: links from findings and recommendations to source records.
   - AI Assistant: contextual questions and answers about the selected application.

## Sample dataset

The repository includes a synthetic workbook named `Legacy_Modernization_Synthetic_Dataset.xlsx` in the project root. It can be uploaded through the Import Dataset action and is intended for demonstrations, local development, and testing.

The dataset is synthetic and does not represent a real customer system. Compatible discovery workbooks can also be uploaded at runtime; the application does not require a fixed dataset path.

## Architecture

```text
apps/
  server/                  Express and TypeScript backend
    src/ai/                LLMaaS client, OAuth token service, and AI context
    src/analysis/          Deterministic analysis engine
    src/db/                Local SQLite persistence
    src/routes/            Workbook, analysis, and AI API routes
    src/services/          Importing, documentation, and Mermaid generation
    src/tests/             Backend tests
  web/                     React, Vite, and Tailwind frontend
    src/api/               Backend API client
    src/components/        Shared interface components
    src/hooks/              Application state and data loading
    src/pages/              Product views

packages/
  shared/                  Shared domain types

Legacy_Modernization_Synthetic_Dataset.xlsx
                         Synthetic sample discovery dataset
```

The backend exposes a health check at `GET /health` and serves the application API under `/api`.

Imported workbooks and generated analysis results are stored in a local SQLite database. By default, the database is created as `legacymind.db` in the server working directory. Set `DB_PATH` to use a different location.

## Analysis and traceability

Dataset-based findings are calculated by the analysis engine rather than hardcoded into the interface. The engine checks areas including:

- Circular and orphaned dependencies.
- Critical business rules without test coverage.
- Parity mismatches between expected and legacy results.
- Dead code and duplicate business logic.
- PII data stores and orphaned data stores.
- Continuity risks and retired integrations.

Findings and recommendations retain references to their source sheet and record. This allows users to verify why an item was identified and supports more defensible modernization decisions.

## Development commands

Run the complete development environment:

```bash
npm run dev
```

Build the backend and frontend:

```bash
npm run build
```

Run type checks:

```bash
npm run typecheck
```

Run backend tests:

```bash
npm test
```

The backend test suite covers workbook parsing and normalization, relationship resolution, dependency analysis, parity evaluation, risk scoring, traceability, AI context handling, credential redaction, caching, OAuth token reuse, and LLMaaS request behavior.

## Security and data handling

- LLMaaS credentials and access tokens remain on the server.
- The frontend communicates with the backend through the `/api` routes.
- AI context is built from the selected application's imported evidence.
- Potential credential content in generated documentation is masked.
- The included workbook is synthetic and should only be used as demonstration data.

## Repository structure

The main supported product is the web application and its backend under `apps/web` and `apps/server`. The shared package contains common domain types. The desktop directory contains an incomplete Electron wrapper and should not be used as the primary way to run the project.
