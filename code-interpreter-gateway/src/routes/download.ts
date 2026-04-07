import { Router, Request, Response } from 'express';
import { getFile } from '../services/session';

const router = Router();

router.get('/download/:sessionId/:fileId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const fileId = req.params.fileId as string;
  const file = getFile(sessionId, fileId);

  if (!file) {
    res.status(404).json({ error: 'File not found' });
    return;
  }

  res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Length', file.content.length);
  res.send(file.content);
});

export default router;
