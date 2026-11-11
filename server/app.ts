import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { inquirySchema, type InquiryRepository } from './inquiries.ts';

export function createApp({ repository, publicOrigin, production = false }: { repository?: InquiryRepository; publicOrigin: string; production?: boolean }) {
  const app = express();
  app.disable('x-powered-by');
  // Production Nginx is the only trusted proxy; listen on loopback only.
  if (production) app.set('trust proxy', 'loopback');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"], connectSrc: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"] } }, strictTransportSecurity: production ? undefined : false }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api/inquiries', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many inquiries. Please try again later.' } }));
  app.use(express.json({ limit: '24kb', type: 'application/json' }));
  app.post('/api/inquiries', async (req, res) => {
    if (req.get('origin') !== publicOrigin) { res.status(403).json({ message: 'Please submit your inquiry from the Give Holidays website.' }); return; }
    if (!req.is('application/json')) { res.status(415).json({ message: 'Please use the website inquiry form.' }); return; }
    const parsed = inquirySchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: 'Please check the required fields and enter a message of at least 10 characters.' }); return; }
    const elapsed = Date.now() - parsed.data.startedAt;
    if (elapsed < 2000 || elapsed > 24 * 60 * 60 * 1000) { res.status(400).json({ message: 'Please refresh the page and complete the form before sending.' }); return; }
    if (!repository) { res.status(503).json({ message: 'The inquiry service is not configured yet. Please try again later.' }); return; }
    try { await repository.save(parsed.data); res.status(201).json({ received: true }); }
    catch { console.error('inquiry_storage_failed'); res.status(503).json({ message: 'Your inquiry could not be saved. Please try again later.' }); }
  });
  // No private endpoints exist in this phase; deny unknown API requests without serving the SPA.
  app.use('/api', (_req, res) => { res.status(404).json({ message: 'Not found' }); });
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    const status = error.status === 413 ? 413 : error instanceof SyntaxError ? 400 : 500;
    res.status(status).json({ message: status === 413 ? 'The request is too large.' : 'The request could not be processed.' });
  };
  app.use(errorHandler);
  return app;
}
