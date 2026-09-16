import { Hono } from 'hono';
import { importWorkbook } from '../services/importer.js';
import { saveWorkbookData, loadWorkbookData } from '../db/database.js';
import path from 'path';

const router = new Hono();

router.post('/import', async (c) => {
  try {
    const xlsxPath = process.env.XLSX_PATH
      ? path.resolve(process.cwd(), process.env.XLSX_PATH)
      : path.resolve(process.cwd(), '../../LegacyMind_Mock_Dataset.xlsx');

    const data = importWorkbook(xlsxPath);
    saveWorkbookData(data);
    return c.json({ success: true, summary: data.importSummary });
  } catch (e) {
    return c.json({ success: false, error: (e as Error).message }, 500);
  }
});

router.get('/data', (c) => {
  const data = loadWorkbookData();
  if (!data) return c.json({ error: 'No data imported yet. POST /api/workbook/import first.' }, 404);
  return c.json(data);
});

router.get('/applications', (c) => {
  const data = loadWorkbookData();
  if (!data) return c.json({ error: 'No data imported' }, 404);
  return c.json(data.applications);
});

export default router;
