import os
from pathlib import Path
import sys

# load .env if present
env_path = Path(__file__).resolve().parents[1] / '.env'
if env_path.exists():
    print(f"Loading env from {env_path}")
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' not in line:
                continue
            k, v = line.split('=', 1)
            os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client

url = os.getenv('SUPABASE_URL')
service_key = os.getenv('SUPABASE_SECRET_KEY') or os.getenv('SUPABASE_SERVICE_KEY')
anon_key = os.getenv('SUPABASE_PUBLISHABLE_KEY') or os.getenv('SUPABASE_ANON_KEY')

print('SUPABASE_URL=', url)
print('HAS_SERVICE_KEY=', bool(service_key))
print('HAS_ANON_KEY=', bool(anon_key))

if not url or not service_key:
    print('Missing required supabase config; aborting')
    sys.exit(2)

try:
    client = create_client(url, service_key)
    print('Client created')
    # Try a simple RPC or table query; prefer a safe call
    try:
        res = client.table('uploads').select('id').limit(1).execute()
        print('Query result:', res)
    except Exception as e:
        print('Table query failed:', repr(e))
    try:
        buckets = client.storage.list_buckets()
        print('Buckets:', buckets)
    except Exception as e:
        print('Storage list_buckets failed:', repr(e))

except Exception as e:
    print('Failed to create supabase client:', repr(e))
    sys.exit(1)

print('Done')
