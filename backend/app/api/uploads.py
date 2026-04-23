from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.api.auth import get_current_user
from app.db.client import supabase
from app.services.pdf_extractor import extract_text_from_bytes
from app.config import settings
import uuid
from ..models.upload import router as uploads_router
import traceback

router = APIRouter()
# Re-export the router so app.main can include it
router = uploads_router


@router.post("/{subject_id}")
async def upload_file(
    subject_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    try:
        if not file.filename.endswith((".pdf",)):
            raise HTTPException(
                status_code=400, detail="Only PDFs supported in Phase 1"
            )

        file_bytes = await file.read()
        storage_path = f"{user_id}/{subject_id}/{uuid.uuid4()}_{file.filename}"

        # upload raw file to Supabase Storage
        upload_res = supabase.storage.from_(settings.storage_bucket)
        upload_res.upload(storage_path, file_bytes, {"content-type": file.content_type})

        # try to get public url (may be empty for private buckets)
        public_url = None
        try:
            pub = upload_res.get_public_url(storage_path)
            if isinstance(pub, dict):
                public_url = pub.get("public_url")
            else:
                public_url = getattr(pub, "public_url", None)
        except Exception:
            public_url = None

        # extract text immediately (async worker in Phase 3)
        try:
            extracted = extract_text_from_bytes(file_bytes, file.filename)
            processed = True
        except Exception:
            extracted = None
            processed = False

        # normalize subject_id: allow callers to pass 'null' or 'none' when no subject
        if subject_id in ("null", "none", ""):
            db_subject_id = None
        else:
            db_subject_id = subject_id

        # save record into uploads table
        record = {
            "subject_id": db_subject_id,
            "user_id": user_id,
            "file_name": file.filename,
            "storage_path": storage_path,
            "bucket": settings.storage_bucket,
            "mime_type": file.content_type,
            "file_size": len(file_bytes),
            "public_url": public_url,
            "extracted_text": extracted,
            "processed": processed,
            "metadata": {},
        }

        res = supabase.table("uploads").insert(record).execute()

        try:
            return res.data[0]
        except Exception:
            return {"ok": False, "result": res}
    except HTTPException:
        raise
    except Exception as e:
        try:
            print("Upload error:", str(e))
            print(traceback.format_exc())
        except Exception:
            pass
        raise HTTPException(status_code=500, detail=str(e))
