CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
  credential_id text PRIMARY KEY,
  username text NOT NULL,
  public_key text NOT NULL,
  counter bigint NOT NULL DEFAULT 0 CHECK (counter >= 0),
  transports text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webauthn_credentials_username_idx
  ON public.webauthn_credentials (username);

CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
  id uuid PRIMARY KEY,
  username text NOT NULL,
  purpose text NOT NULL CHECK (purpose IN ('registration', 'authentication')),
  challenge text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webauthn_challenges_expiry_idx
  ON public.webauthn_challenges (expires_at);

ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.webauthn_credentials FROM anon, authenticated;
REVOKE ALL ON TABLE public.webauthn_challenges FROM anon, authenticated;
