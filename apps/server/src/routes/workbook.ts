import { Router } from 'express';
import { importWorkbook } from '../services/importer.js';
import { saveWorkbookData, loadWorkbookData } from '../db/database.js';
import path from 'path';

const router = Router();

router.post('/import', async (_req, res) => {
  try {
    const xlsxPath = process.env.XLSX_PATH
      ? path.resolve(process.cwd(), process.env.XLSX_PATH)
      : path.resolve(process.cwd(), '../../LegacyMind_Mock_Dataset.xlsx');

    const data = importWorkbook(xlsxPath);
    saveWorkbookData(data);
    return res.json({ success: true, summary: data.importSummary });
  } catch (e) {
    return res.status(500).json({ success: false, error: (e as Error).message });
  }
});

router.get('/data', (_req, res) => {
  const data = loadWorkbookData();
  if (!data) return res.status(404).json({ error: 'No data imported yet. POST /api/workbook/import first.' });
  return res.json(data);
});

router.get('/applications', (_req, res) => {
  const data = loadWorkbookData();
  if (!data) return res.status(404).json({ error: 'No data imported' });
  return res.json(data.applications);
});

export default router;
