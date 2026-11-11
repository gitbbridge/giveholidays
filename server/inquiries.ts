import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Pool } from 'pg';

const text = (max: number) => z.string().trim().max(max).refine(value => [...value].every(char => char.charCodeAt(0) >= 32 || ['\n', '\r', '\t'].includes(char)));
const optionalText = (max: number) => text(max).optional().default('');
const base = {
  name: text(120).min(2), email: z.email().max(254), phone: optionalText(50),
  companyUrl: z.literal('').optional().default(''),
  startedAt: z.number().finite().int().positive(),
};
export const inquirySchema = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('contact'), organization: text(160).min(1),
    inquiryType: z.enum(['Nonprofit Partnership', 'Hotel / Supplier Partnership', 'Existing Travel Package', 'General Inquiry']), message: text(5000).min(10) }),
  z.object({ ...base, kind: z.literal('partnership'), propertyName: text(160).min(2),
    website: z.url().max(500).refine(value => ['http:', 'https:'].includes(new URL(value).protocol)),
    jobTitle: text(160).min(1), phone: text(50).min(3), message: optionalText(5000) }),
]);
export type Inquiry = z.infer<typeof inquirySchema>;
export interface InquiryRepository { save(inquiry: Inquiry): Promise<string> }
export class PostgresInquiryRepository implements InquiryRepository {
  constructor(private readonly pool: Pool) {}
  async save(inquiry: Inquiry) {
    const client = await this.pool.connect();
    const id = randomUUID();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO inquiries
        (id, kind, name, email, organization, property_name, website, job_title, phone, inquiry_type, message)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
        id, inquiry.kind, inquiry.name, inquiry.email,
        inquiry.kind === 'contact' ? inquiry.organization : null,
        inquiry.kind === 'partnership' ? inquiry.propertyName : null,
        inquiry.kind === 'partnership' ? inquiry.website : null,
        inquiry.kind === 'partnership' ? inquiry.jobTitle : null,
        inquiry.phone || null, inquiry.kind === 'contact' ? inquiry.inquiryType : null, inquiry.message,
      ]);
      await client.query('INSERT INTO email_outbox (id, inquiry_id) VALUES ($1, $2)', [randomUUID(), id]);
      await client.query('COMMIT');
      return id;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
}
