import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services import ai_provider

router = APIRouter()


class WhatsAppRequest(BaseModel):
    message: str
    audience: str
    language: str = "english"


@router.post("/generate")
async def generate_whatsapp(body: WhatsAppRequest, db: Session = Depends(get_db)):
    prompt = f"""You are a WhatsApp marketing copywriter for Indian MSMEs.

Message to communicate: {body.message}
Target Audience: {body.audience}
Language: {body.language}

Generate 3 WhatsApp message variations:
1. Formal — professional tone, respectful
2. Casual — conversational, friendly, emoji-friendly
3. Urgency — creates FOMO and urgency, time-sensitive feel

WhatsApp formatting rules:
- *bold* for emphasis
- _italic_ for softer emphasis
- Line breaks for readability on mobile
- Keep under 300 characters when possible
- No HTML
- Use relevant emojis for casual and urgency versions

Return ONLY a JSON object:
{{
  "formal": "...",
  "casual": "...",
  "urgency": "...",
  "tips": ["tip1", "tip2", "tip3"]
}}

tips should be 3 practical WhatsApp marketing tips relevant to this message.
No explanation outside the JSON.
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
        data = {
            "formal": raw,
            "casual": raw,
            "urgency": raw,
            "tips": ["Keep messages concise", "Use line breaks for readability", "Add a clear call to action"],
        }

    return data
