import json
from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import Campaign
from backend.services import ai_provider
from backend.services.festival_calendar import get_festivals_in_range

router = APIRouter()


class CampaignRequest(BaseModel):
    business_type: str
    product: str
    customer: str
    budget_range: str
    goal: str
    duration_days: int = 30
    language: str = "english"
    campaign_name: Optional[str] = ""


class CampaignOut(BaseModel):
    id: int
    name: str
    business_type: str
    duration_days: int
    goals: str
    calendar_data: str

    class Config:
        from_attributes = True


@router.post("/generate")
async def generate_campaign(body: CampaignRequest, db: Session = Depends(get_db)):
    start = date.today()
    end = start + timedelta(days=body.duration_days)
    festivals = get_festivals_in_range(start, end)
    festival_text = "\n".join(
        [f"- {f['date']}: {f['name']}" for f in festivals]
    ) or "No major festivals in this period."

    prompt = f"""You are a marketing strategist for Indian MSMEs. Create a detailed week-by-week marketing campaign calendar.

Business Details:
- Business Type: {body.business_type}
- Product/Service: {body.product}
- Target Customer: {body.customer}
- Budget Range: {body.budget_range}
- Goal: {body.goal}
- Duration: {body.duration_days} days (starting {start.isoformat()})
- Language for content: {body.language}

Indian festivals and events in this period:
{festival_text}

Generate a JSON array with one object per week. Each week object must have these exact fields:
- "week": week number (1, 2, 3, etc.)
- "dates": date range string (e.g. "Jan 1 - Jan 7")
- "platform": primary platform to focus on (Instagram / LinkedIn / WhatsApp / Facebook)
- "theme": content theme for the week
- "hook": the main message hook or angle
- "content_ideas": array of 2-3 specific post ideas
- "festival_tie_in": festival or event to leverage this week (or "None")
- "cta": call to action for this week

Return ONLY the JSON array, no explanation, no markdown code blocks.
"""

    try:
        raw = await ai_provider.generate(prompt, db)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        calendar = json.loads(raw)
    except ai_provider.AllProvidersExhausted as e:
        raise HTTPException(status_code=503, detail=str(e))
    except json.JSONDecodeError:
        calendar = [{"week": 1, "raw_response": raw}]

    campaign = Campaign(
        name=body.campaign_name or f"{body.business_type} Campaign",
        business_type=body.business_type,
        duration_days=body.duration_days,
        goals=body.goal,
        calendar_data=json.dumps(calendar),
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return {"id": campaign.id, "calendar": calendar, "festivals": festivals}


@router.get("/", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.get("/{campaign_id}")
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {
        "id": c.id,
        "name": c.name,
        "business_type": c.business_type,
        "duration_days": c.duration_days,
        "goals": c.goals,
        "calendar": json.loads(c.calendar_data),
        "created_at": c.created_at.isoformat(),
    }


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Campaign not found")
    db.delete(c)
    db.commit()
    return {"deleted": True}
