import { Router, Request, Response } from 'express';
import { executeCode } from '../services/piston';

const router = Router();

router.post('/exec', async (req: Request, res: Response) => {
  try {
    const { lang, code, args, files, session_id } = req.body;

    if (!lang || !code) {
      res.status(400).json({ error: 'lang and code are required' });
      return;
    }

    const result = await executeCode({ lang, code, args, files, session_id });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error('[exec] Error:', message);
    res.status(500).json({ error: message });
  }
});

export default router;
