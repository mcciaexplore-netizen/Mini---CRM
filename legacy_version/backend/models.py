from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Boolean, Text, Date, DateTime
from backend.database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False)  # gemini/groq/mistral/cohere/openai
    api_key = Column(String, nullable=False)
    label = Column(String, default="")
    priority = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    calls_today = Column(Integer, default=0)
    calls_month = Column(Integer, default=0)
    last_reset_date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)


class BusinessProfile(Base):
    __tablename__ = "business_profile"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="")
    industry = Column(String, default="")
    target_audience = Column(String, default="")
    brand_color = Column(String, default="#6366f1")
    brand_voice = Column(Text, default="{}")
    default_language = Column(String, default="english")
    default_tone = Column(String, default="casual")


class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="")
    business_type = Column(String, default="")
    duration_days = Column(Integer, default=30)
    goals = Column(String, default="")
    calendar_data = Column(Text, default="[]")
    created_at = Column(DateTime, default=datetime.utcnow)


class ContentDraft(Base):
    __tablename__ = "content_drafts"

    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String, default="")
    tone = Column(String, default="")
    language = Column(String, default="")
    content = Column(Text, default="")
    hashtags = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
