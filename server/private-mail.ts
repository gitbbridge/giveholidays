import { randomUUID } from "node:crypto";
import type { Transporter } from "nodemailer";
import type { Database, Query } from "./database.ts";
import { encrypt, decrypt } from "./security.ts";
export interface PrivateMail {
  to: string;
  subject: string;
  text: string;
}
export async function queueMail(query: Query, mail: PrivateMail, key: string) {
  await query(
    "INSERT INTO private_email_outbox(id,encrypted_payload) VALUES($1,$2)",
    [randomUUID(), encrypt(mail, key)],
  );
}
export async function deliverPrivateMail(
  database: Database,
  transport: Pick<Transporter, "sendMail">,
  key: string,
  from: string,
  redirect?: string,
) {
  const row = await database.transaction(
    async (q) =>
      (
        await q(
          `UPDATE private_email_outbox SET status='processing',attempts=attempts+1,available_at=now()+interval '5 minutes' WHERE id=(SELECT id FROM private_email_outbox WHERE status IN ('pending','processing') AND available_at<=now() AND attempts<8 ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
        )
      ).rows[0],
  );
  if (!row) return false;
  try {
    const mail = decrypt<PrivateMail>(String(row.encrypted_payload), key);
    await transport.sendMail({
      ...mail,
      to: redirect || mail.to,
      from,
      messageId: `<${row.id}@giveholidays.com>`,
    });
    await database.query(
      "UPDATE private_email_outbox SET status='sent' WHERE id=$1",
      [row.id],
    );
  } catch {
    await database.query(
      "UPDATE private_email_outbox SET status=$2,available_at=now()+interval '15 minutes' WHERE id=$1",
      [row.id, Number(row.attempts) >= 8 ? "failed" : "pending"],
    );
    console.error("private_notification_failed");
  }
  return true;
}
