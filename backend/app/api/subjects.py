from fastapi import APIRouter, Depends, HTTPException
from .auth import get_current_user
from ..db.client import supabase
from pydantic import BaseModel

router = APIRouter()


class SubjectCreate(BaseModel):
    title: str
    color: str = "#6366f1"


class SubjectUpdate(BaseModel):
    title: str | None = None
    color: str | None = None


@router.get("/")
async def list_subjects(user_id: str = Depends(get_current_user)):
    res = (
        supabase.table("subjects")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


@router.post("/")
async def create_subject(body: SubjectCreate, user_id: str = Depends(get_current_user)):
    res = (
        supabase.table("subjects")
        .insert(
            {
                "user_id": user_id,
                "title": body.title,
                "color": body.color,
            }
        )
        .execute()
    )
    return res.data[0]


@router.patch("/{subject_id}")
async def update_subject(
    subject_id: str, body: SubjectUpdate, user_id: str = Depends(get_current_user)
):
    updates = body.model_dump(exclude_none=True)
    res = (
        supabase.table("subjects")
        .update(updates)
        .eq("id", subject_id)
        .eq("user_id", user_id)
        .execute()
    )
    return res.data[0]


@router.delete("/{subject_id}")
async def delete_subject(subject_id: str, user_id: str = Depends(get_current_user)):
    supabase.table("subjects").delete().eq("id", subject_id).eq(
        "user_id", user_id
    ).execute()
    return {"deleted": True}
