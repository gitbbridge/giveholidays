import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { inquirySchema, type InquiryRepository } from './inquiries.ts';
import { registerCara } from './cara-routes.ts';
import { HttpError, type PrivateConfig } from './access.ts';

export function createApp({ repository, publicOrigin, production = false, privateConfig,release='development',ready }: { repository?: InquiryRepository; publicOrigin: string; production?: boolean; privateConfig?: PrivateConfig;release?:string;ready?:()=>Promise<boolean> }) {
  const app = express();
  app.disable('x-powered-by');
  // Production Nginx is the only trusted proxy; listen on loopback only.
  if (production) app.set('trust proxy', 'loopback');
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], imgSrc: ["'self'", 'data:'], fontSrc: ["'self'"], connectSrc: ["'self'"], formAction: ["'self'"], frameAncestors: ["'none'"] } }, strictTransportSecurity: production ? undefined : false }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok',release }));
  app.get('/api/ready',async(_req,res)=>{try{if(!ready||!await ready()){res.status(503).json({ready:false});return;}res.json({ready:true,release});}catch{res.status(503).json({ready:false});}});
  app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use('/api/inquiries', rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { message: 'Too many inquiries. Please try again later.' } }));
  const smallJson=express.json({limit:'24kb',type:'application/json'}),privateJson=express.json({limit:'512kb',type:'application/json'});
  app.use((req,res,next)=>(req.path.startsWith('/api/private/')||req.path.startsWith('/api/admin/')?privateJson:smallJson)(req,res,next));
  if(privateConfig)registerCara(app,privateConfig);
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
  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    const status = error instanceof HttpError ? error.status : error.status === 413 || error.code==='LIMIT_FILE_SIZE' ? 413 : error instanceof SyntaxError || error.name==='MulterError' ? 400 : 500;
    if(status===401&&!req.path.startsWith('/api/')){res.status(401).type('html').send('<!doctype html><html lang="en"><head><meta name="robots" content="noindex,nofollow"><title>Private access | Give Holidays</title></head><body><h1>Verified access required</h1><p>Use your private invitation to access hotel proposals.</p><a href="/admin-entry">Administrator verification</a><p><a href="/hotel-partners">Request partnership information</a></p></body></html>');return;}
    res.status(status).json({ message: error instanceof HttpError ? error.message : status === 413 ? 'The request is too large.' : 'The request could not be processed.' });
  };
  app.use(errorHandler);
  return app;
}
