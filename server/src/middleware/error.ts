import { Request, Response } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: unknown) {
  console.error('[Error]', err);

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({ error: 'Erro na base de dados' });
  }

  return res.status(500).json({ error: 'Erro interno do servidor' });
}
