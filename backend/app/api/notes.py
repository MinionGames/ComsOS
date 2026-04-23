from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from pydantic import BaseModel

from app.api.auth import get_current_user
from app.db.client import supabase

router = APIRouter()


class NoteCreate(BaseModel):
    subject_id: Optional[str] = None
    title: str
    content: str


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None


@router.get("/")
async def list_notes(
    subject_id: Optional[str] = None, user_id: str = Depends(get_current_user)
):
    q = supabase.table("notes").select("*").eq("user_id", user_id)
    if subject_id:
        q = q.eq("subject_id", subject_id)
    res = q.order("created_at", desc=True).execute()
    return res.data


@router.post("/")
async def create_note(body: NoteCreate, user_id: str = Depends(get_current_user)):
    record = {
        "user_id": user_id,
        "subject_id": body.subject_id,
        "title": body.title,
        "content": body.content,
    }
    res = supabase.table("notes").insert(record).execute()
    try:
        return res.data[0]
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to create note")


@router.patch("/{note_id}")
async def update_note(
    note_id: str, body: NoteUpdate, user_id: str = Depends(get_current_user)
):
    updates = body.model_dump(exclude_none=True)
    res = (
        supabase.table("notes")
        .update(updates)
        .eq("id", note_id)
        .eq("user_id", user_id)
        .execute()
    )
    try:
        return res.data[0]
    except Exception:
        raise HTTPException(
            status_code=404, detail="Note not found or not owned by user"
        )


router = APIRouter()


@router.get("/", summary="List notes")
def list_notes():
    return {"notes": []}
