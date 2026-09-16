import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { initDb } from './db/database.js';
import workbookRouter from './routes/workbook.js';
import analysisRouter from './routes/analysis.js';
import path from 'path';

const app = new Hono();

// Init DB
const dbPath = process.env.DB_PATH ?? path.resolve(process.cwd(), 'legacymind.db');
initDb(dbPath);

app.use('*', cors({ origin: '*' }));

app.get('/health', (c) => c.json({ status: 'ok', time: new Date().toISOString() }));

app.route('/api/workbook', workbookRouter);
app.route('/api/analysis', analysisRouter);

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: err.message }, 500);
});

const port = Number(process.env.PORT ?? 3001);
console.log(`LegacyMind AI server starting on port ${port}`);

export default { port, fetch: app.fetch };
