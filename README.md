# LegacyMind AI

> **"Understand what exists. Prove what matters. Modernize with confidence."**

An AI-powered legacy application modernization workspace. Turns opaque legacy discovery data into evidence-backed understanding, documentation, dependency maps, parity tests, and risk-aware modernization recommendations.

**Core principle: PROVE BEFORE YOU REPLACE.**

---

## Quick Start

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 22.5+ | [nvm](https://github.com/nvm-sh/nvm) |

### 1. Clone & start

```bash
# From the project root
chmod +x start.sh
./start.sh
```

Then open **http://localhost:5173** in your browser.

### 2. Manual start (two terminals)

**Terminal 1 — Backend:**
```bash
cd apps/server
npm install
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd apps/web
npm install --no-package-lock
npm run dev
```

Open **http://localhost:5173**

---

## Demo Flow

1. Click **Import Dataset** (top bar) — select any XLSX discovery dataset from your device (e.g. `LegacyMind_Mock_Dataset.xlsx`)
2. Select an application from the dropdown
3. Click **Analyze Application**
4. Navigate through:
   - **Overview** — dataset summary, critical findings, top recommendations
   - **Understand** — app profile, modules, business rules, findings
   - **Dependencies** — interactive graph, cycle detection, orphan detection
   - **Documents** — Functional Documentation + Process Flow (Mermaid)
   - **Tests** — parity results, PASS/MISMATCH/UNKNOWN, untested critical rules
   - **Modernize** — prioritized recommendations with NOW/NEXT/LATER roadmap
   - **Risks** — grouped findings by Security/Continuity/Dependency/Testing/etc.
   - **Traceability** — every finding/recommendation/test traced to source records

---

## Gemini AI (Optional)

Add your API key to `apps/server/.env`:

```
GEMINI_API_KEY=your_key_here
```

Without a key, all deterministic analysis still works. AI only enhances documentation and test scenario generation.

---

## Architecture

```
apps/
  server/          Node.js + Express backend
    src/
      analysis/    Deterministic engine (cycles, orphans, parity, risk scoring)
      ai/          LLMProvider + GeminiProvider abstraction
      db/          SQLite via Node.js built-in node:sqlite
      routes/      /api/workbook, /api/analysis
      services/    XLSX importer, documentation generator
      tests/       18 unit tests

  web/             React + Vite + Tailwind frontend
    src/
      api/         HTTP client
      components/  Layout, shared UI
      hooks/       useApp context (state management)
      pages/       Dashboard, Understand, Dependencies, Documents,
                   Tests, Modernize, Risks, Traceability
      types/       Shared TypeScript types

  desktop/         Electron wrapper (main.js + preload.js)

packages/
  shared/          Domain types (Application, Module, Finding, etc.)

LegacyMind_Mock_Dataset.xlsx   Sample dataset for local development (any compatible XLSX can be uploaded)
```

---

## What's Detected Automatically

All findings are **deterministic** — derived from the dataset, never hardcoded:

| Finding | Detection Method |
|---------|-----------------|
| Circular dependencies | DFS graph traversal |
| Orphan dependencies | Target ID resolution against module inventory |
| Critical rules without tests | has_test_case=N + criticality filter |
| Parity mismatches | expected_result ≠ legacy_result |
| Dead code modules | is_dead_code=Y flag |
| Duplicate business logic | duplicate_of field |
| PII data stores | pii_present=Y flag |
| Orphan data stores | owning_app_id not in Applications |
| Continuity risks | preserves_continuity=N in backlog |
| Retired integrations | Active status + retired downstream target |

---

## Running Tests

```bash
cd apps/server
npm test
```

18 tests covering: XLSX parsing, normalization, relationship resolution, cycle detection, orphan detection, parity evaluation, risk scoring, traceability.

---

## Environment Variables

`apps/server/.env`:

```
GEMINI_API_KEY=          # Optional — enables AI features
PORT=3001                # Backend port (default 3001)
DB_PATH=./legacymind.db
```

Datasets are uploaded from the UI at runtime — no fixed dataset path is required.

**The API key is never sent to the frontend.**

---

## Data Integrity Guarantees

- All displayed values derived from imported XLSX — no hardcoded counts or IDs
- Every finding has `evidence[]` pointing to `{ sheet, recordId, field, value }`
- Every recommendation has evidence references
- AI-generated content is clearly labeled
- Potential credential content in docs is masked, never echoed
