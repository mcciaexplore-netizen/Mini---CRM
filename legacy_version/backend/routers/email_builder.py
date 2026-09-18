import json
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.services import ai_provider

router = APIRouter()

EMAIL_TEMPLATES = {
    "diwali_sale": {
        "name": "Diwali Sale",
        "subject": "✨ Diwali Special Offer Just for You!",
        "html": """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#fff8e1;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden}
.header{background:linear-gradient(135deg,#ff6f00,#ffa000);padding:40px 20px;text-align:center;color:white}
.header h1{margin:0;font-size:28px}
.body{padding:30px 20px;color:#333}
.cta{display:block;background:#ff6f00;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;text-align:center;font-size:16px;margin:20px 0}
.footer{background:#fff8e1;padding:20px;text-align:center;color:#888;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>🪔 Happy Diwali!</h1><p>Celebrate with our Special Offers</p></div>
  <div class="body">
    <p>Dear Valued Customer,</p>
    <p>This Diwali, we're lighting up your world with <strong>exclusive deals</strong> you won't want to miss!</p>
    <p><strong>[KEY OFFER HERE]</strong></p>
    <p>Offer valid until [DATE]. Don't miss out!</p>
    <a href="#" class="cta">Shop Now →</a>
    <p>Warm Diwali wishes,<br><strong>[BRAND NAME]</strong></p>
  </div>
  <div class="footer">© 2025 [BRAND NAME] | Unsubscribe</div>
</div></body></html>"""
    },
    "product_launch": {
        "name": "Product Launch",
        "subject": "🚀 Introducing [Product Name] — Now Available!",
        "html": """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden}
.header{background:#1a1a2e;padding:40px 20px;text-align:center;color:white}
.header h1{margin:0;font-size:26px}
.body{padding:30px 20px;color:#333}
.cta{display:block;background:#6366f1;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;text-align:center;font-size:16px;margin:20px 0}
.footer{background:#f5f5f5;padding:20px;text-align:center;color:#888;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>🚀 New Launch Alert</h1><p>[BRAND NAME]</p></div>
  <div class="body">
    <p>Hi [Customer Name],</p>
    <p>We're thrilled to introduce <strong>[PRODUCT NAME]</strong> — designed for [TARGET CUSTOMER].</p>
    <p>[KEY BENEFIT 1] · [KEY BENEFIT 2] · [KEY BENEFIT 3]</p>
    <a href="#" class="cta">Explore Now →</a>
    <p>Be among the first to experience it.</p>
    <p>Best,<br><strong>[BRAND NAME] Team</strong></p>
  </div>
  <div class="footer">© 2025 [BRAND NAME]</div>
</div></body></html>"""
    },
    "welcome": {
        "name": "Welcome Email",
        "subject": "Welcome to [BRAND NAME] — We're Glad You're Here!",
        "html": """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f0fdf4;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden}
.header{background:#16a34a;padding:40px 20px;text-align:center;color:white}
.body{padding:30px 20px;color:#333}
.cta{display:block;background:#16a34a;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;text-align:center;font-size:16px;margin:20px 0}
.footer{background:#f0fdf4;padding:20px;text-align:center;color:#888;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>Welcome! 🎉</h1></div>
  <div class="body">
    <p>Hi [Customer Name],</p>
    <p>Welcome to <strong>[BRAND NAME]</strong>! We're excited to have you with us.</p>
    <p>Here's what you can expect from us: [VALUE PROPOSITION]</p>
    <a href="#" class="cta">Get Started →</a>
    <p>Reach out anytime at [EMAIL].</p>
    <p>Warm regards,<br><strong>[BRAND NAME] Team</strong></p>
  </div>
  <div class="footer">© 2025 [BRAND NAME]</div>
</div></body></html>"""
    },
    "invoice_reminder": {
        "name": "Invoice / Payment Reminder",
        "subject": "Friendly Reminder: Invoice #[NUMBER] Due",
        "html": """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#fef2f2;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden}
.header{background:#dc2626;padding:30px 20px;text-align:center;color:white}
.body{padding:30px 20px;color:#333}
.cta{display:block;background:#dc2626;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;text-align:center;font-size:16px;margin:20px 0}
.footer{background:#fef2f2;padding:20px;text-align:center;color:#888;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>Payment Reminder</h1></div>
  <div class="body">
    <p>Dear [Client Name],</p>
    <p>This is a friendly reminder that Invoice <strong>#[NUMBER]</strong> for ₹[AMOUNT] is due on <strong>[DUE DATE]</strong>.</p>
    <p>Please make the payment at your earliest convenience to avoid any interruption in service.</p>
    <a href="#" class="cta">Pay Now →</a>
    <p>If you have already paid, please disregard this email.</p>
    <p>Thanks,<br><strong>[BRAND NAME]</strong></p>
  </div>
  <div class="footer">© 2025 [BRAND NAME]</div>
</div></body></html>"""
    },
    "b2b_outreach": {
        "name": "B2B Outreach",
        "subject": "Partnership Opportunity with [BRAND NAME]",
        "html": """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f8fafc;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden}
.header{background:#0f172a;padding:30px 20px;text-align:center;color:white}
.body{padding:30px 20px;color:#333;line-height:1.6}
.cta{display:block;background:#0f172a;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;text-align:center;font-size:16px;margin:20px 0}
.footer{background:#f8fafc;padding:20px;text-align:center;color:#888;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>[BRAND NAME]</h1></div>
  <div class="body">
    <p>Dear [Contact Name],</p>
    <p>I'm reaching out from <strong>[BRAND NAME]</strong> regarding a potential collaboration opportunity.</p>
    <p>We specialize in [YOUR SPECIALTY] and believe we can add value to [THEIR COMPANY] by [SPECIFIC VALUE].</p>
    <p>I'd love to schedule a 20-minute call to explore this further.</p>
    <a href="#" class="cta">Schedule a Call →</a>
    <p>Looking forward to connecting.</p>
    <p>Best regards,<br><strong>[YOUR NAME]</strong><br>[BRAND NAME]</p>
  </div>
  <div class="footer">© 2025 [BRAND NAME]</div>
</div></body></html>"""
    },
    "follow_up": {
        "name": "Follow-Up",
        "subject": "Following Up — [BRAND NAME]",
        "html": """<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;background:#f5f3ff;margin:0;padding:0}
.container{max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden}
.header{background:#7c3aed;padding:30px 20px;text-align:center;color:white}
.body{padding:30px 20px;color:#333;line-height:1.6}
.cta{display:block;background:#7c3aed;color:white;text-decoration:none;padding:14px 28px;border-radius:8px;text-align:center;font-size:16px;margin:20px 0}
.footer{background:#f5f3ff;padding:20px;text-align:center;color:#888;font-size:12px}
</style></head><body>
<div class="container">
  <div class="header"><h1>Just Checking In</h1></div>
  <div class="body">
    <p>Hi [Name],</p>
    <p>I wanted to follow up on my previous message about [TOPIC]. I understand you're busy, so I'll keep this brief.</p>
    <p>Is there anything I can clarify or help you with? Happy to answer any questions.</p>
    <a href="#" class="cta">Reply to This Email →</a>
    <p>Warm regards,<br><strong>[YOUR NAME]</strong></p>
  </div>
  <div class="footer">© 2025 [BRAND NAME]</div>
</div></body></html>"""
    },
}


class EmailGenerateRequest(BaseModel):
    email_type: str
    brand_name: str
    brand_color: str = "#6366f1"
    key_message: str
    language: str = "english"


@router.post("/generate")
async def generate_email(body: EmailGenerateRequest, db: Session = Depends(get_db)):
    prompt = f"""You are an email marketing expert for Indian MSMEs. Generate a complete, responsive HTML email.

Email Type: {body.email_type}
Brand Name: {body.brand_name}
Brand Color: {body.brand_color}
Key Message: {body.key_message}
Language: {body.language}

Requirements:
- Complete HTML document with inline CSS
- Mobile-responsive design
- Use {body.brand_color} as the primary accent color
- Written in {body.language}
- Professional and polished
- Include header, body content, CTA button, and footer
- CTA button should use the brand color
- Keep it under 600px width

Return ONLY the HTML, no explanation, no markdown.
"""

    try:
        html = await ai_provider.generate(prompt, db)
        html = html.strip()
        if html.startswith("```"):
            parts = html.split("```")
            html = parts[1] if len(parts) > 1 else html
            if html.startswith("html"):
                html = html[4:]
    except ai_provider.AllProvidersExhausted as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {"html": html}


@router.get("/templates")
def list_templates():
    return [
        {"id": k, "name": v["name"], "subject": v["subject"]}
        for k, v in EMAIL_TEMPLATES.items()
    ]


@router.get("/templates/{template_id}")
def get_template(template_id: str):
    if template_id not in EMAIL_TEMPLATES:
        raise HTTPException(status_code=404, detail="Template not found")
    t = EMAIL_TEMPLATES[template_id]
    return {"id": template_id, "name": t["name"], "subject": t["subject"], "html": t["html"]}
