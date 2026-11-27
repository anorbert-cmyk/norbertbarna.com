-- Production schema (PostgreSQL 16). Multi-tenant: every row carries tenant_id,
-- enforced with row level security so one customer can never read another's data.

CREATE TABLE tenant (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  retention_days integer NOT NULL DEFAULT 365,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE connector_key (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  token_hash  bytea NOT NULL,          -- sha256 of the bearer token
  secret_enc  bytea NOT NULL,          -- HMAC secret, encrypted with a KMS key
  last_seen   timestamptz,
  version     text,
  revoked_at  timestamptz
);

CREATE TABLE site       (id text, tenant_id uuid REFERENCES tenant(id), name text NOT NULL, PRIMARY KEY (tenant_id, id));
CREATE TABLE department (id text, tenant_id uuid REFERENCES tenant(id), name text NOT NULL, site_id text, PRIMARY KEY (tenant_id, id));
CREATE TABLE door (
  id text, tenant_id uuid REFERENCES tenant(id), site_id text NOT NULL, name text NOT NULL,
  controller text, reader text, kind text CHECK (kind IN ('perimeter','vehicle','internal','restricted')),
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE person (
  id            text, tenant_id uuid REFERENCES tenant(id),
  employee_no   text NOT NULL,
  name          text NOT NULL,
  department_id text,
  position      text,
  card_type     text,
  card_masked   text,                 -- never the full UID
  card_valid_until date,
  active        boolean NOT NULL DEFAULT true,
  PRIMARY KEY (tenant_id, id)
);

CREATE TABLE access_event (
  id          bigint GENERATED ALWAYS AS IDENTITY,
  tenant_id   uuid NOT NULL REFERENCES tenant(id),
  source_id   text NOT NULL,          -- Predor event id, for idempotent ingest
  ts          timestamptz NOT NULL,
  person_id   text,
  door_id     text NOT NULL,
  type        text NOT NULL CHECK (type IN ('granted','denied_rights','denied_time','denied_expired','denied_unknown','door_held','door_forced')),
  direction   text CHECK (direction IN ('in','out')),
  PRIMARY KEY (tenant_id, ts, id),
  UNIQUE (tenant_id, source_id, ts)
) PARTITION BY RANGE (ts);
CREATE INDEX ON access_event (tenant_id, person_id, ts);
CREATE INDEX ON access_event (tenant_id, door_id, ts);

CREATE TABLE leave_day (
  tenant_id uuid REFERENCES tenant(id), person_id text, day date,
  code text NOT NULL CHECK (code IN ('vacation','sick','homeoffice')),
  PRIMARY KEY (tenant_id, person_id, day)
);

CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenant(id),
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','hr','manager','security')),
  departments text[],                 -- null = all
  sites text[] NOT NULL,
  entra_oid text,
  UNIQUE (tenant_id, email)
);

CREATE TABLE saved_view (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  name text NOT NULL, page text NOT NULL, query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Append-only access log (GDPR accountability). No UPDATE/DELETE grants for the app role.
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tenant_id uuid NOT NULL, user_id uuid, ts timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL, detail text
);

ALTER TABLE access_event ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON access_event USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- Same policy on person, leave_day, saved_view, audit_log.
