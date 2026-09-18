from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ApiKey

router = APIRouter()

VALID_PROVIDERS = {"gemini", "groq", "mistral", "cohere", "openai"}


class ApiKeyCreate(BaseModel):
    provider: str
    api_key: str
    label: Optional[str] = ""
    priority: Optional[int] = 10


class ApiKeyOut(BaseModel):
    id: int
    provider: str
    api_key: str
    label: str
    priority: int
    is_active: bool
    calls_today: int
    calls_month: int

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=List[ApiKeyOut])
def list_keys(db: Session = Depends(get_db)):
    return db.query(ApiKey).order_by(ApiKey.priority).all()


@router.post("/", response_model=ApiKeyOut)
def add_key(body: ApiKeyCreate, db: Session = Depends(get_db)):
    if body.provider not in VALID_PROVIDERS:
        raise HTTPException(status_code=400, detail=f"Invalid provider. Choose from {VALID_PROVIDERS}")
    key = ApiKey(
        provider=body.provider,
        api_key=body.api_key,
        label=body.label or "",
        priority=body.priority,
        last_reset_date=date.today(),
    )
    db.add(key)
    db.commit()
    db.refresh(key)
    return key


@router.patch("/{key_id}/toggle")
def toggle_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    key.is_active = not key.is_active
    db.commit()
    return {"id": key.id, "is_active": key.is_active}


@router.patch("/{key_id}/priority")
def update_priority(key_id: int, priority: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    key.priority = priority
    db.commit()
    return {"id": key.id, "priority": key.priority}


@router.delete("/{key_id}")
def delete_key(key_id: int, db: Session = Depends(get_db)):
    key = db.query(ApiKey).filter(ApiKey.id == key_id).first()
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    db.delete(key)
    db.commit()
    return {"deleted": True}
