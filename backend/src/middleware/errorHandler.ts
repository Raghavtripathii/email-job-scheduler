import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError';

export function notFound(req: Request, res: Response) {
  res.status(404).json({ error: `route not found: ${req.method} ${req.path}` });
}

// express 5 sends async errors here by itself
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'invalid input',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  console.error('unhandled error:', err);
  res.status(500).json({ error: 'something went wrong' });
}