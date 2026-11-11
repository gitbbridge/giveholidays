ALTER TABLE inquiries ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'New';
CREATE TABLE IF NOT EXISTS administrative_users(id uuid PRIMARY KEY,email text UNIQUE NOT NULL,active boolean NOT NULL DEFAULT true,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS hotel_properties(id uuid PRIMARY KEY,name text NOT NULL,source_inquiry_id uuid UNIQUE REFERENCES inquiries(id),details jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS hotel_contacts(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),name text NOT NULL,email text NOT NULL,job_title text,phone text,UNIQUE(hotel_id,email));
CREATE TABLE IF NOT EXISTS invitations(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),contact_id uuid NOT NULL REFERENCES hotel_contacts(id),email text NOT NULL,token_hash text UNIQUE NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz,consumed_at timestamptz,created_by uuid NOT NULL REFERENCES administrative_users(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS auth_challenges(id uuid PRIMARY KEY,email text NOT NULL,role text NOT NULL CHECK(role IN ('admin','hotel')),invitation_id uuid REFERENCES invitations(id),code_hash text NOT NULL,expires_at timestamptz NOT NULL,attempts integer NOT NULL DEFAULT 0,used_at timestamptz);
CREATE TABLE IF NOT EXISTS private_sessions(id_hash text PRIMARY KEY,role text NOT NULL CHECK(role IN ('admin','hotel')),email text NOT NULL,admin_id uuid REFERENCES administrative_users(id),hotel_id uuid REFERENCES hotel_properties(id),invitation_id uuid REFERENCES invitations(id),csrf text NOT NULL,expires_at timestamptz NOT NULL,revoked_at timestamptz,created_at timestamptz NOT NULL DEFAULT now(),CHECK((role='admin' AND admin_id IS NOT NULL AND hotel_id IS NULL) OR (role='hotel' AND hotel_id IS NOT NULL AND invitation_id IS NOT NULL)));
CREATE TABLE IF NOT EXISTS cara_submissions(id uuid PRIMARY KEY,hotel_id uuid UNIQUE NOT NULL REFERENCES hotel_properties(id),status text NOT NULL DEFAULT 'Draft' CHECK(status IN ('Draft','Submitted','Under Review','Revision Requested','Approved for Signature','Executed','Declined','Expired')),method text NOT NULL DEFAULT 'online' CHECK(method IN ('online','upload')),draft jsonb NOT NULL DEFAULT '{}',revision integer NOT NULL DEFAULT 0,revision_message text,submitted_at timestamptz,updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS room_types(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid NOT NULL REFERENCES cara_submissions(id),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS seasonal_rates(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid NOT NULL REFERENCES cara_submissions(id),room_type_id uuid NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,season text NOT NULL CHECK(season IN ('High Season','Mid Season','Low Season','Blackout / Restricted Period Rates')),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS allocations(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid NOT NULL REFERENCES cara_submissions(id),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS blackout_periods(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid NOT NULL REFERENCES cara_submissions(id),kind text NOT NULL CHECK(kind IN ('Unavailable','Restricted Rate','Special Event')),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS booking_rules(submission_id uuid PRIMARY KEY REFERENCES cara_submissions(id),hotel_id uuid NOT NULL REFERENCES hotel_properties(id),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS payment_terms(submission_id uuid PRIMARY KEY REFERENCES cara_submissions(id),hotel_id uuid NOT NULL REFERENCES hotel_properties(id),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS cancellation_policies(submission_id uuid PRIMARY KEY REFERENCES cara_submissions(id),hotel_id uuid NOT NULL REFERENCES hotel_properties(id),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS guest_benefits(submission_id uuid PRIMARY KEY REFERENCES cara_submissions(id),hotel_id uuid NOT NULL REFERENCES hotel_properties(id),details jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS agreement_versions(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid NOT NULL REFERENCES cara_submissions(id),version integer NOT NULL,payload jsonb NOT NULL,approved_content jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(submission_id,version));
CREATE TABLE IF NOT EXISTS private_documents(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid NOT NULL REFERENCES cara_submissions(id),kind text NOT NULL DEFAULT 'proposal' CHECK(kind IN ('proposal','property_logo','executed')),original_name text NOT NULL,storage_name text UNIQUE NOT NULL,mime text NOT NULL,size_bytes integer NOT NULL,sha256 text NOT NULL,scan_status text NOT NULL CHECK(scan_status IN ('clean','quarantined')),created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS administrative_notes(id uuid PRIMARY KEY,hotel_id uuid NOT NULL REFERENCES hotel_properties(id),submission_id uuid REFERENCES cara_submissions(id),admin_id uuid NOT NULL REFERENCES administrative_users(id),note text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS audit_events(id uuid PRIMARY KEY,admin_id uuid REFERENCES administrative_users(id),action text NOT NULL,record_id text,metadata jsonb NOT NULL DEFAULT '{}',created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS private_email_outbox(id uuid PRIMARY KEY,encrypted_payload text NOT NULL,status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','sent','failed')),attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS private_email_pending ON private_email_outbox(status,available_at);
CREATE INDEX IF NOT EXISTS private_session_expiry ON private_sessions(expires_at);
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['hotel_contacts','cara_submissions','room_types','seasonal_rates','allocations','blackout_periods','booking_rules','payment_terms','cancellation_policies','guest_benefits','agreement_versions','private_documents'] LOOP
 EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',t);
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename=t AND policyname='hotel_isolation') THEN
 EXECUTE format('CREATE POLICY hotel_isolation ON %I USING (current_setting(''app.role'',true)=''admin'' OR hotel_id::text=current_setting(''app.hotel_id'',true)) WITH CHECK (current_setting(''app.role'',true)=''admin'' OR hotel_id::text=current_setting(''app.hotel_id'',true))',t);
 END IF;
 END LOOP;
END $$;
ALTER TABLE hotel_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_properties FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='hotel_properties' AND policyname='hotel_property_isolation') THEN
 CREATE POLICY hotel_property_isolation ON hotel_properties USING(current_setting('app.role',true)='admin' OR id::text=current_setting('app.hotel_id',true)) WITH CHECK(current_setting('app.role',true)='admin' OR id::text=current_setting('app.hotel_id',true));
 END IF;
END $$;
ALTER TABLE administrative_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE administrative_notes FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_policies WHERE tablename='administrative_notes' AND policyname='admin_only') THEN
 CREATE POLICY admin_only ON administrative_notes USING(current_setting('app.role',true)='admin') WITH CHECK(current_setting('app.role',true)='admin');
 END IF;
END $$;
INSERT INTO schema_migrations(version) VALUES('002_private_cara') ON CONFLICT DO NOTHING;
