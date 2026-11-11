CREATE TABLE IF NOT EXISTS schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inquiries (
  id uuid PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('contact', 'partnership')),
  name text NOT NULL,
  email text NOT NULL,
  organization text,
  property_name text,
  website text,
  job_title text,
  phone text,
  inquiry_type text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id uuid PRIMARY KEY,
  inquiry_id uuid NOT NULL REFERENCES inquiries(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
CREATE INDEX IF NOT EXISTS email_outbox_pending ON email_outbox(status, available_at);
INSERT INTO schema_migrations(version) VALUES ('001_public_inquiries') ON CONFLICT DO NOTHING;
