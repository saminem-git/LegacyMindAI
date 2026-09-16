import { Database } from 'bun:sqlite';
import type { WorkbookData, AnalysisResult } from '../../../packages/shared/src/index.js';

let db: Database;

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function initDb(dbPath: string): void {
  db = new Database(dbPath, { create: true });
  db.exec(`
    CREATE TABLE IF NOT EXISTS workbook_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      imported_at TEXT NOT NULL,
      data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS analysis_results (
      id TEXT PRIMARY KEY,
      app_id TEXT NOT NULL,
      analyzed_at TEXT NOT NULL,
      result TEXT NOT NULL
    );
  `);
}

export function saveWorkbookData(data: WorkbookData): void {
  getDb().run('DELETE FROM workbook_data');
  getDb().run('INSERT INTO workbook_data (imported_at, data) VALUES (?, ?)', [
    new Date().toISOString(),
    JSON.stringify(data),
  ]);
}

export function loadWorkbookData(): WorkbookData | null {
  const row = getDb().query('SELECT data FROM workbook_data ORDER BY id DESC LIMIT 1').get() as { data: string } | null;
  if (!row) return null;
  return JSON.parse(row.data) as WorkbookData;
}

export function saveAnalysisResult(result: AnalysisResult): void {
  getDb().run(
    'INSERT OR REPLACE INTO analysis_results (id, app_id, analyzed_at, result) VALUES (?, ?, ?, ?)',
    [result.id, result.appId, result.analyzedAt, JSON.stringify(result)]
  );
}

export function loadAnalysisResult(appId: string): AnalysisResult | null {
  const row = getDb().query('SELECT result FROM analysis_results WHERE app_id = ? ORDER BY analyzed_at DESC LIMIT 1').get(appId) as { result: string } | null;
  if (!row) return null;
  return JSON.parse(row.result) as AnalysisResult;
}

export function listAnalysisResults(): { id: string; app_id: string; analyzed_at: string }[] {
  return getDb().query('SELECT id, app_id, analyzed_at FROM analysis_results ORDER BY analyzed_at DESC').all() as { id: string; app_id: string; analyzed_at: string }[];
}
