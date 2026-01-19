"""Trial Navigator - FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import db
from api.routes_trials import router as trials_router
from api.routes_search import router as search_router
from api.routes_users import router as users_router
from api.routes_languages import router as languages_router
from api.routes_webhooks import router as webhooks_router
from api.routes_feed import router as feed_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    print("Starting Trial Navigator API...")
    if settings.database_url:
        await db.connect()
        print("Database connected")
    yield
    # Shutdown
    if db.pool:
        await db.disconnect()
        print("Database disconnected")


app = FastAPI(
    title="Trial Navigator API",
    description="""
    მრავალენოვანი კლინიკური კვლევების აგრეგატორი.

    Trial Navigator aggregates clinical trials from multiple global registries
    and translates them to 40+ underserved languages.

    ## Features
    - Search trials from ClinicalTrials.gov, WHO ICTRP, EU CTR, and more
    - AI-powered translation to Georgian, Armenian, Azerbaijani, and other languages
    - Medical glossary with verified translations
    - Email digests and alerts
    """,
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(trials_router, prefix="/api/trials", tags=["trials"])
app.include_router(search_router, prefix="/api/search", tags=["search"])
app.include_router(users_router, prefix="/api/users", tags=["users"])
app.include_router(languages_router, prefix="/api/languages", tags=["languages"])
app.include_router(webhooks_router, prefix="/api/webhooks", tags=["webhooks"])
app.include_router(feed_router, tags=["feed", "profile"])


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Trial Navigator API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected" if db.pool else "disconnected"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug
    )
