from app.config import settings

def mask(s):
    if not s:
        return '<empty>'
    return s[:10] + '...' + s[-6:]

print('service_startswith_sb:', settings.supabase_service_key.startswith('sb_') if settings.supabase_service_key else False)
print('anon_startswith_sb:', settings.supabase_anon_key.startswith('sb_') if settings.supabase_anon_key else False)
print('service:', mask(settings.supabase_service_key))
print('anon:', mask(settings.supabase_anon_key))
print('url:', settings.supabase_url)
