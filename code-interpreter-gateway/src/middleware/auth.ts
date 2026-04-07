import { Request, Response, NextFunction } from 'express';

const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY;

export function auth(req: Request, res: Response, next: NextFunction): void {
  if (!GATEWAY_API_KEY) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];
  if (apiKey !== GATEWAY_API_KEY) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  next();
}
