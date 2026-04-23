from app.db.client import supabase
from app.config import settings
import uuid

path = "test_upload.pdf"
with open(path, "rb") as f:
    data = f.read()

storage_path = f"test-uploads/{uuid.uuid4()}_{path}"
print("Uploading to", settings.storage_bucket, "->", storage_path)
res = supabase.storage.from_(settings.storage_bucket).upload(
    storage_path, data, {"content-type": "application/pdf"}
)
print("Upload result:", res)
try:
    pub = supabase.storage.from_(settings.storage_bucket).get_public_url(storage_path)
    print("Public URL:", pub)
except Exception as e:
    print("Public URL error:", e)

# Optionally insert a metadata row (requires table 'uploads')
try:
    record = {
        "subject_id": None,
        "user_id": "test-bypass",
        "file_name": path,
        "storage_path": storage_path,
        "bucket": settings.storage_bucket,
        "mime_type": "application/pdf",
        "file_size": len(data),
        "public_url": None,
        "extracted_text": None,
        "processed": False,
        "metadata": {},
    }
    ins = supabase.table("uploads").insert(record).execute()
    print("DB insert result:", ins)
except Exception as e:
    print("DB insert error:", e)
