import type { Pool } from "pg";
import type { PGlite } from "@electric-sql/pglite";

export type Row = Record<string, unknown>;
export type Query = <T extends Row = Row>(
  sql: string,
  values?: unknown[],
) => Promise<{ rows: T[] }>;
export interface Database {
  query: Query;
  transaction<T>(fn: (query: Query) => Promise<T>): Promise<T>;
}
export function postgresDatabase(pool: Pool): Database {
  return {
    query: pool.query.bind(pool) as Query,
    transaction: async (fn) => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await fn(client.query.bind(client) as Query);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
export function embeddedDatabase(database: PGlite): Database {
  return {
    query: database.query.bind(database) as Query,
    transaction: (fn) =>
      database.transaction((tx) => fn(tx.query.bind(tx) as Query)),
  };
}
export interface Actor {
  role: "admin" | "hotel";
  hotelId?: string;
  adminId?: string;
  invitationId?: string;
  email: string;
  sessionId: string;
  csrf: string;
}
export function authorizedTransaction<T>(
  database: Database,
  actor: Actor,
  fn: (query: Query) => Promise<T>,
) {
  return database.transaction(async (query) => {
    await query(
      "SELECT set_config('app.role',$1,true),set_config('app.hotel_id',$2,true)",
      [actor.role, actor.hotelId || ""],
    );
    return fn(query);
  });
}
