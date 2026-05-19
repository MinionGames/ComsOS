from supabase import create_client
import os
from typing import Optional

# Read configuration directly from environment which should be loaded from
# backend/.env by app.config at import time. This avoids depending on
# pydantic Settings during module import ordering.
supabase_url: Optional[str] = os.getenv("SUPABASE_URL")
# prefer new names
supabase_service_key: Optional[str] = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_KEY")
supabase_anon_key: Optional[str] = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

if not supabase_url:
	raise RuntimeError("Supabase configuration missing: set SUPABASE_URL in backend/.env")

if not supabase_service_key:
	raise RuntimeError(
		"Supabase secret key missing: set SUPABASE_SECRET_KEY (or legacy SERVICE_KEY) in backend/.env"
	)

try:
	supabase = create_client(supabase_url, supabase_service_key)
except Exception:
	raise

if not supabase_anon_key:
	supabase_anon = supabase
	try:
		sk = supabase_service_key or ""
		print("Supabase client initialized: using service key for anon fallback (masked)", (sk[:8] + "..." + sk[-6:]) if sk else "<empty>")
	except Exception:
		pass
else:
	supabase_anon = create_client(supabase_url, supabase_anon_key)
	try:
		ak = supabase_anon_key or ""
		print("Supabase anon client initialized with publishable key (masked)", (ak[:8] + "..." + ak[-6:]) if ak else "<empty>")
	except Exception:
		pass
