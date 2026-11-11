import { PGlite } from '@electric-sql/pglite';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import type { Pool } from 'pg';
import { PostgresInquiryRepository } from './inquiries.ts';

// Optional isolated local PostgreSQL engine. Production always requires the real PG service.
export async function localDevelopmentRepository(directory: string) {
  if (process.env.NODE_ENV === 'production') throw new Error('Local development storage cannot run in production.');
  const localRoot = resolve('.local');
  const target = resolve(directory);
  const child = relative(localRoot, target);
  if (!child || child.startsWith('..') || isAbsolute(child)) throw new Error('Local database must be inside this checkout’s ignored .local directory.');
  await mkdir(localRoot, { recursive: true });
  const database = new PGlite(target);
  await database.exec(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
  // PGlite serializes transactions. Each request uses the same SQL persistence logic
  // as production, inside its own transaction, without overlapping BEGIN statements.
  const repository = {
    save: async (inquiry: Parameters<PostgresInquiryRepository['save']>[0]) => database.transaction(async transaction => {
      const adapter = { connect: async () => ({
        query: (sql: string, values?: unknown[]) => ['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) ? Promise.resolve({ rows: [] }) : transaction.query(sql, values),
        release() {},
      }) } as unknown as Pool;
      return new PostgresInquiryRepository(adapter).save(inquiry);
    }),
  };
  return { repository, close: () => database.close() };
}
