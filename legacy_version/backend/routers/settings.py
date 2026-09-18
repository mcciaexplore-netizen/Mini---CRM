from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import BusinessProfile

router = APIRouter()


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    target_audience: Optional[str] = None
    brand_color: Optional[str] = None
    brand_voice: Optional[str] = None
    default_language: Optional[str] = None
    default_tone: Optional[str] = None


class ProfileOut(BaseModel):
    id: int
    name: str
    industry: str
    target_audience: str
    brand_color: str
    brand_voice: str
    default_language: str
    default_tone: str

    model_config = ConfigDict(from_attributes=True)


def _get_or_create_profile(db: Session) -> BusinessProfile:
    profile = db.query(BusinessProfile).first()
    if not profile:
        profile = BusinessProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.get("/profile", response_model=ProfileOut)
def get_profile(db: Session = Depends(get_db)):
    return _get_or_create_profile(db)


@router.patch("/profile", response_model=ProfileOut)
def update_profile(body: ProfileUpdate, db: Session = Depends(get_db)):
    profile = _get_or_create_profile(db)
    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)
    db.commit()
    db.refresh(profile)
    return profile
