import type { Pool } from 'pg';
import type { Transporter } from 'nodemailer';

export async function deliverOne(pool: Pool, transporter: Transporter, config: { from: string; to: string }) {
  const claimed = await pool.query(`UPDATE email_outbox SET status='processing', attempts=attempts+1, available_at=now()+interval '5 minutes'
    WHERE id=(SELECT id FROM email_outbox WHERE ((status='pending' OR status='processing') AND available_at <= now()) AND attempts < 8
    ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING id, inquiry_id, attempts`);
  const item = claimed.rows[0];
  if (!item) return false;
  try {
    const { rows: [inquiry] } = await pool.query('SELECT * FROM inquiries WHERE id=$1', [item.inquiry_id]);
    await transporter.sendMail({ from: config.from, to: config.to, replyTo: inquiry.email,
      messageId: `<${item.id}@giveholidays.com>`,
      subject: inquiry.kind === 'partnership' ? 'New Give Holidays hotel partnership inquiry' : 'New Give Holidays contact inquiry',
      text: Object.entries(inquiry).filter(([key]) => !['id', 'created_at'].includes(key)).map(([key, value]) => `${key}: ${value ?? ''}`).join('\n'),
    });
    await pool.query("UPDATE email_outbox SET status='sent', sent_at=now() WHERE id=$1", [item.id]);
  } catch {
    await pool.query("UPDATE email_outbox SET status=$2, available_at=now()+interval '15 minutes' WHERE id=$1", [item.id, item.attempts >= 8 ? 'failed' : 'pending']);
    console.error('inquiry_notification_failed');
  }
  return true;
}
