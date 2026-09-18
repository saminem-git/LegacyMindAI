import { Router } from 'express';
import multer from 'multer';
import { importWorkbookBuffer } from '../services/importer.js';
import { saveWorkbookData, loadWorkbookData } from '../db/database.js';

const router = Router();

// Dataset is user-supplied at runtime; nothing is read from a fixed path on disk.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

router.post('/import', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded. Select an XLSX dataset to import.' });
    }
    const data = await importWorkbookBuffer(req.file.buffer, req.file.originalname);
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
