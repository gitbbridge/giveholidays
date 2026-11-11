import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import type { Transporter } from 'nodemailer';
import request from 'supertest';
import { createApp } from '../server/app.ts';
import { PostgresInquiryRepository } from '../server/inquiries.ts';
import { deliverOne } from '../server/outbox.ts';

// Real embedded PostgreSQL SQL engine; isolated in memory, no production data or SMTP.
const database = new PGlite();
const pool = { query: (sql: string, values?: unknown[]) => database.query(sql, values), connect: async () => ({ query: (sql: string, values?: unknown[]) => database.query(sql, values), release() {} }) } as unknown as Pool;
const origin = 'http://127.0.0.1:5173';
const repository = new PostgresInquiryRepository(pool);
const payload = () => ({ kind: 'contact', name: 'Test Contact', email: 'contact@example.test', organization: 'Fictional Nonprofit', inquiryType: 'Nonprofit Partnership', phone: '', message: 'This is an isolated test inquiry.', companyUrl: '', startedAt: Date.now() - 5000 });
before(async () => { await database.exec(await readFile(new URL('../server/schema.sql', import.meta.url), 'utf8')); });
after(async () => { await database.close(); });

test('validated inquiry persists together with an administrator notification job', async () => {
  const app = createApp({ repository, publicOrigin: origin });
  const response = await request(app).post('/api/inquiries').set('Origin', origin).send(payload());
  assert.equal(response.status, 201);
  const { rows } = await database.query('SELECT i.name, i.message, e.status FROM inquiries i JOIN email_outbox e ON e.inquiry_id=i.id');
  assert.equal(rows.length, 1); assert.equal((rows[0] as Record<string, unknown>).status, 'pending');
  assert.deepEqual(response.body, { received: true });
});
test('server rejects malformed fields, spam and foreign origins without storage', async () => {
  const app = createApp({ repository, publicOrigin: origin });
  assert.equal((await request(app).post('/api/inquiries').set('Origin', 'https://untrusted.example').send(payload())).status, 403);
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({ ...payload(), email: 'invalid' })).status, 400);
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({ ...payload(), companyUrl: 'spam' })).status, 400);
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({ ...payload(), startedAt: Date.now() })).status, 400);
  const { rows } = await database.query('SELECT count(*)::int AS count FROM inquiries');
  assert.equal((rows[0] as Record<string, unknown>).count, 1);
});
test('partnership inquiries validate the website scheme and persist approved public fields', async () => {
  const app = createApp({ repository, publicOrigin: origin });
  const inquiry = { ...payload(), kind: 'partnership', propertyName: 'Fictional Hotel', jobTitle: 'Sales Manager', phone: '555-0100', website: 'https://hotel.example.test', message: '' };
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({ ...inquiry, website: 'javascript:alert(1)' })).status, 400);
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send(inquiry)).status, 201);
});
test('SQL metacharacters remain data, and private inquiry retrieval is unavailable', async () => {
  const app = createApp({ repository, publicOrigin: origin });
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({ ...payload(), name: "Test'; DROP TABLE inquiries; --" })).status, 201);
  assert.equal((await request(app).get('/api/inquiries')).status, 404);
  const { rows } = await database.query('SELECT count(*)::int AS count FROM inquiries');
  assert.equal((rows[0] as Record<string, unknown>).count, 3);
});
test('unconfigured storage returns an honest failure and oversized bodies are rejected', async () => {
  const app = createApp({ publicOrigin: origin });
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send(payload())).status, 503);
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({ ...payload(), message: 'a'.repeat(30000) })).status, 413);
});
test('submission rate limiting is enforced', async () => {
  const app = createApp({ publicOrigin: origin });
  for (let i = 0; i < 5; i++) await request(app).post('/api/inquiries').set('Origin', origin).send({});
  assert.equal((await request(app).post('/api/inquiries').set('Origin', origin).send({})).status, 429);
});
test('notification worker sends via a test transport and marks the durable job delivered', async () => {
  const sent: Record<string, unknown>[] = [];
  const transporter = { sendMail: async (message: Record<string, unknown>) => { sent.push(message); } } as unknown as Transporter;
  assert.equal(await deliverOne(pool, transporter, { from: 'test@example.test', to: 'admin@example.test' }), true);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'admin@example.test');
  const { rows } = await database.query("SELECT count(*)::int AS count FROM email_outbox WHERE status='sent'");
  assert.equal((rows[0] as Record<string, unknown>).count, 1);
});
test('failed notification stays queued for retry without discarding the inquiry', async () => {
  const transporter = { sendMail: async () => { throw new Error('Test SMTP outage'); } } as unknown as Transporter;
  await deliverOne(pool, transporter, { from: 'test@example.test', to: 'admin@example.test' });
  const { rows } = await database.query("SELECT count(*)::int AS count FROM email_outbox WHERE status='pending' AND attempts=1");
  assert.equal((rows[0] as Record<string, unknown>).count, 1);
});
