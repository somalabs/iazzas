import { Router, Request, Response } from 'express';
import { getSessionFiles } from '../services/session';

const router = Router();

router.get('/files/:sessionId', (req: Request, res: Response) => {
  const sessionId = req.params.sessionId as string;
  const detail = req.query.detail as string | undefined;
  const files = getSessionFiles(sessionId);

  if (detail === 'full') {
    res.json(
      files.map((f) => ({
        name: `${sessionId}/${f.id}`,
        metadata: { 'original-filename': f.name },
        lastModified: new Date(f.createdAt).toISOString(),
        size: f.content.length,
      })),
    );
    return;
  }

  res.json(
    files.map((f) => ({
      name: `${sessionId}/${f.id}`,
      metadata: { 'original-filename': f.name },
      lastModified: new Date(f.createdAt).toISOString(),
    })),
  );
});

export default router;
