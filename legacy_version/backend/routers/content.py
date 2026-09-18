import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.models import ContentDraft
from backend.services import ai_provider

router = APIRouter()


class PostRequest(BaseModel):
    platform: str
    tone: str
    language: str
    description: str
    brand_name: str = ""


class HashtagRequest(BaseModel):
    niche: str
    platform: str
    location: str = "Maharashtra, India"


@router.post("/post/generate")
async def generate_post(body: PostRequest, db: Session = Depends(get_db)):
    brand_ctx = f"Brand name: {body.brand_name}. " if body.brand_name else ""
    prompt = f"""You are a social media copywriter for Indian MSMEs.

{brand_ctx}Generate 3 variations of a {body.tone} social media post for {body.platform} in {body.language}.

What to communicate: {body.description}

Requirements per variation:
- Platform-appropriate length ({body.platform}: Instagram ~150 words, LinkedIn ~200 words, WhatsApp ~80 words, Facebook ~120 words)
- {body.tone} tone (casual = conversational, professional = formal/polished, festive = celebratory/energetic)
- Language: {body.language} (use natural {body.language} — not just translation)
- Include a clear call-to-action
- Include 5-10 relevant hashtags (for Instagram/LinkedIn/Facebook; skip for WhatsApp)

Return ONLY a JSON object with this structure:
{{
  "variations": [
    {{"caption": "...", "hashtags": "..."}},
    {{"caption": "...", "hashtags": "..."}},
    {{"caption": "...", "hashtags": "..."}}
  ]
}}
No explanation, no markdown.
"""

    try:
        raw = await ai_provider.generate(prompt, db)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
    except ai_provider.AllProvidersExhausted as e:
        raise HTTPException(status_code=503, detail=str(e))
    except json.JSONDecodeError:
        data = {"variations": [{"caption": raw, "hashtags": ""}]}

    # Save first variation as draft
    if data.get("variations"):
        v = data["variations"][0]
        draft = ContentDraft(
            platform=body.platform,
            tone=body.tone,
            language=body.language,
            content=v.get("caption", ""),
            hashtags=v.get("hashtags", ""),
        )
        db.add(draft)
        db.commit()

    return data


@router.post("/hashtags/generate")
async def generate_hashtags(body: HashtagRequest, db: Session = Depends(get_db)):
    prompt = f"""You are a social media hashtag strategist for Indian MSMEs.

Generate hashtags for:
- Business niche: {body.niche}
- Platform: {body.platform}
- Location: {body.location}

Return ONLY a JSON object:
{{
  "broad": ["hashtag1", "hashtag2", ...],
  "niche": ["hashtag1", "hashtag2", ...],
  "local": ["hashtag1", "hashtag2", ...]
}}

- broad: 8 high-volume general hashtags
- niche: 8 specific to this business type
- local: 6 location/India-specific hashtags

No # prefix, no explanation.
"""

    try:
        raw = await ai_provider.generate(prompt, db)
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)
    except ai_provider.AllProvidersExhausted as e:
        raise HTTPException(status_code=503, detail=str(e))
    except json.JSONDecodeError:
        data = {"broad": [], "niche": [], "local": [], "raw": raw}

    return data


@router.get("/drafts")
def list_drafts(db: Session = Depends(get_db)):
    drafts = db.query(ContentDraft).order_by(ContentDraft.created_at.desc()).limit(50).all()
    return [
        {
            "id": d.id,
            "platform": d.platform,
            "tone": d.tone,
            "language": d.language,
            "content": d.content,
            "hashtags": d.hashtags,
            "created_at": d.created_at.isoformat(),
        }
        for d in drafts
    ]
