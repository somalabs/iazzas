import { Router, Request, Response } from 'express';
import multer from 'multer';
import { getOrCreateSession, addFile } from '../services/session';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const sessionId = req.body.session_id ?? req.headers['session-id'];
    const session = getOrCreateSession(sessionId as string | undefined);
    const file = addFile(session.id, req.file.originalname, req.file.buffer);

    res.json({
      message: 'success',
      session_id: session.id,
      files: [{ fileId: file.id, filename: file.name }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[upload] Error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
