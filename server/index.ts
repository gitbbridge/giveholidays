import express from 'express';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { createApp } from './app.ts';
import { PostgresInquiryRepository } from './inquiries.ts';
import { deliverOne } from './outbox.ts';

const production = process.env.NODE_ENV === 'production';
const publicOrigin = process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:5173';
if (production && (!process.env.DATABASE_URL || !process.env.PUBLIC_ORIGIN || !process.env.SMTP_HOST || !process.env.MAIL_FROM || !process.env.ADMIN_EMAIL)) throw new Error('Production database, origin and email configuration are required.');
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }) : undefined;
const local = !pool && !production && process.env.LOCAL_DATABASE_DIR ? await (await import('./local-development.ts')).localDevelopmentRepository(process.env.LOCAL_DATABASE_DIR) : undefined;
const app = createApp({ repository: pool ? new PostgresInquiryRepository(pool) : local?.repository, publicOrigin, production });
if (production) {
  app.use(express.static(resolve('dist'), { index: false }));
  app.get(['/', '/hotel-partners', '/privacy', '/terms', '/privacy-policy', '/terms-and-conditions'], (_req, res) => res.sendFile(resolve('dist/index.html')));
  app.use((_req, res) => res.status(404).send('Not found'));
}
const server = app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`Give Holidays API listening on loopback port ${process.env.PORT || 3001}`));
let working = false;
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  connectionTimeout: 15000, socketTimeout: 30000,
}) : undefined;
const timer = setInterval(async () => {
  if (!pool || !transporter || !process.env.MAIL_FROM || !process.env.ADMIN_EMAIL || working) return;
  working = true;
  try { for (let i = 0; i < 10; i++) if (!await deliverOne(pool, transporter, { from: process.env.MAIL_FROM, to: process.env.ADMIN_EMAIL })) break; }
  catch { console.error('notification_worker_failed'); }
  finally { working = false; }
}, 10000);
async function shutdown() { clearInterval(timer); server.close(); await pool?.end(); await local?.close(); }
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
