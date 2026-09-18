import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from backend.database import init_db
from backend.routers import api_keys, settings, campaign, content, email_builder, whatsapp

app = FastAPI(title="ProMarketer API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_keys.router, prefix="/api/keys", tags=["API Keys"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(campaign.router, prefix="/api/campaign", tags=["Campaign Planner"])
app.include_router(content.router, prefix="/api/content", tags=["Content Studio"])
app.include_router(email_builder.router, prefix="/api/email", tags=["Email Builder"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp Crafter"])


@app.on_event("startup")
async def startup_event():
    init_db()


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": "ProMarketer"}


# Serve built React frontend in production
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
