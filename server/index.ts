import express from 'express';
import { resolve } from 'node:path';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import { createApp } from './app.ts';
import { PostgresInquiryRepository } from './inquiries.ts';
import { deliverOne } from './outbox.ts';
import { postgresDatabase,embeddedDatabase } from './database.ts';
import { initializeAccess,type PrivateConfig } from './access.ts';
import { deliverPrivateMail } from './private-mail.ts';
import { mkdir,writeFile,readFile,access } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const production = process.env.NODE_ENV === 'production';
const publicOrigin = process.env.PUBLIC_ORIGIN || 'http://127.0.0.1:5173';
if (production && (!process.env.DATABASE_URL || !process.env.PUBLIC_ORIGIN || !process.env.SMTP_HOST || !process.env.MAIL_FROM || !process.env.ADMIN_EMAIL)) throw new Error('Production database, origin and email configuration are required.');
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, max: 10 }) : undefined;
const local = !pool && !production && process.env.LOCAL_DATABASE_DIR ? await (await import('./local-development.ts')).localDevelopmentRepository(process.env.LOCAL_DATABASE_DIR) : undefined;
const database=pool?postgresDatabase(pool):local?embeddedDatabase(local.database):undefined;
if(production&&database){
 const role=(await database.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
 if(role?.rolsuper||role?.rolbypassrls)throw new Error('Production application role must not be superuser or bypass row-level security.');
 if((await database.query("SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename='cara_submissions' AND tableowner=current_user")).rows.length)throw new Error('Use a separate non-owner production application role.');
}
const privateConfig:PrivateConfig|undefined=database&&process.env.PRIVATE_SECRET&&process.env.CARA_CONTENT_PATH&&process.env.PRIVATE_DOCUMENT_DIR?{database,secret:process.env.PRIVATE_SECRET,origin:publicOrigin,production,adminEmails:(process.env.ADMIN_EMAILS||'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean),contentPath:process.env.CARA_CONTENT_PATH,documentDirectory:process.env.PRIVATE_DOCUMENT_DIR,legalReviewApproved:process.env.LEGAL_REVIEW_APPROVED==='true'}:undefined;
if(production&&(!privateConfig||!privateConfig.adminEmails.length))throw new Error('Production private access configuration is required.');
if(production&&process.env.TEST_MAIL_DIR)throw new Error('Test mailbox capture is not permitted in production.');
if(process.env.APP_ENV==='staging'&&!process.env.EMAIL_REDIRECT_TO)throw new Error('Staging email must be redirected to a test-only mailbox.');
if(privateConfig)await initializeAccess(privateConfig);
if(privateConfig)await access(privateConfig.contentPath);
const releaseMetadata=await readFile('release.json','utf8').then(value=>JSON.parse(value) as {commit:string}).catch(()=>undefined);
const release=process.env.RELEASE_SHA||releaseMetadata?.commit||'development';
if(production&&!/^[a-f0-9]{40}$/.test(release))throw new Error('Production requires the exact release commit SHA.');
const app = createApp({ repository: pool ? new PostgresInquiryRepository(pool) : local?.repository, publicOrigin, production,privateConfig,release,ready:database?async()=>{await database.query('SELECT 1');return true;}:undefined });
if(privateConfig)app.use('/private-assets',express.static(resolve('build/private'),{index:false,cacheControl:false}));
else app.use(['/cara','/admin','/private-assets'],(_req,res)=>res.status(503).send('Private access is not configured.'));
if (production) {
  app.use(express.static(resolve('dist'), { index: false }));
  app.get(['/', '/hotel-partners', '/access','/admin-entry', '/privacy', '/terms', '/privacy-policy', '/terms-and-conditions'], (_req, res) => res.sendFile(resolve('dist/index.html')));
  app.use((_req, res) => res.status(404).send('Not found'));
}
const server = app.listen(Number(process.env.PORT || 3001), '127.0.0.1', () => console.log(`Give Holidays API listening on loopback port ${process.env.PORT || 3001}`));
let working = false;
const transporter = process.env.SMTP_HOST ? nodemailer.createTransport({
  host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_SECURE === 'true',
  auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  connectionTimeout: 15000, socketTimeout: 30000,
  requireTLS:process.env.SMTP_SECURE!=='true',
}) : undefined;
const captureDirectory=!production&&process.env.TEST_MAIL_DIR?resolve(process.env.TEST_MAIL_DIR):undefined;
if(captureDirectory&&!captureDirectory.startsWith(`${resolve('.local')}/`)&&!captureDirectory.startsWith(`${resolve('.local')}\\`))throw new Error('Local test mailbox must be inside ignored .local storage.');
const privateTransport=captureDirectory?{sendMail:async(mail:unknown)=>{await mkdir(captureDirectory,{recursive:true,mode:0o700});await writeFile(resolve(captureDirectory,`${Date.now()}-${randomUUID()}.json`),JSON.stringify(mail),{mode:0o600,flag:'wx'});return {} as never;}}:transporter;
const timer = setInterval(async () => {
  if (working) return;
  working = true;
  try {
   if(pool&&transporter&&process.env.MAIL_FROM&&process.env.ADMIN_EMAIL)for(let i=0;i<10;i++)if(!await deliverOne(pool,transporter,{from:process.env.MAIL_FROM,to:process.env.EMAIL_REDIRECT_TO||process.env.ADMIN_EMAIL}))break;
   if(database&&privateConfig&&privateTransport)for(let i=0;i<20;i++)if(!await deliverPrivateMail(database,privateTransport,privateConfig.secret,process.env.MAIL_FROM||'local-test@example.test',process.env.EMAIL_REDIRECT_TO))break;
  }
  catch { console.error('notification_worker_failed'); }
  finally { working = false; }
}, 10000);
async function shutdown() { clearInterval(timer); server.close(); await pool?.end(); await local?.close(); }
process.once('SIGTERM', shutdown); process.once('SIGINT', shutdown);
