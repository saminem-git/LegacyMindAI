import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { initDb } from './db/database.js';
import workbookRouter from './routes/workbook.js';
import analysisRouter from './routes/analysis.js';
import aiRouter from './routes/ai.js';
import path from 'path';

const app = express();

// Init DB
const dbPath = process.env.DB_PATH ?? path.resolve(process.cwd(), 'legacymind.db');
initDb(dbPath);

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/workbook', workbookRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/ai', aiRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  return res.status(500).json({ error: err.message });
});

const port = Number(process.env.PORT ?? 3001);
console.log(`LegacyMind AI server starting on port ${port}`);

app.listen(port, () => {
  console.log(`LegacyMind AI server listening on port ${port}`);
});

export default app;
