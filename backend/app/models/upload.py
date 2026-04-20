from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from app.api.auth import get_current_user
from app.db.client import supabase
from app.services.pdf_extractor import extract_text_from_bytes
from app.config import settings
import uuid

router = APIRouter()

@router.post("/{subject_id}")
async def upload_file(
    subject_id: str,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    if not file.filename.endswith((".pdf",)):
        raise HTTPException(status_code=400, detail="Only PDFs supported in Phase 1")

    file_bytes = await file.read()
    storage_path = f"{user_id}/{subject_id}/{uuid.uuid4()}_{file.filename}"

    # upload raw file to Supabase Storage
    supabase.storage.from_(settings.storage_bucket)\
        .upload(storage_path, file_bytes, {"content-type": file.content_type})

    # extract text immediately (async worker in Phase 3)
    try:
        extracted = extract_text_from_bytes(file_bytes, file.filename)
        status = "processed"
    except Exception:
        extracted = None
        status = "failed"

    # save record
    res = supabase.table("uploads").insert({
        "subject_id": subject_id,
        "user_id": user_id,
        "filename": file.filename,
        "storage_path": storage_path,
        "extracted_text": extracted,
        "status": status,
    }).execute()

    return res.data[0]