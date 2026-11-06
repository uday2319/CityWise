from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from contextlib import asynccontextmanager

from backend.core.config import settings
from backend.api.routes import itinerary, attractions, restaurants, cities, analytics
from backend.services.ml_service import MLService


# Global ML service instance (loaded once at startup)
ml_service: MLService = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: load ML models on startup."""
    global ml_service
    print("🚀 Starting Itinera API...")
    ml_service = MLService()
    await ml_service.load_all()
    print("✅ ML models loaded")

    app.state.ml_service = ml_service

    yield  # App runs here

    print("Shutting down...")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered travel itinerary planner API",
    lifespan=lifespan,
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Register routes
app.include_router(itinerary.router, prefix="/api/v1/itinerary", tags=["itinerary"])
app.include_router(attractions.router, prefix="/api/v1/attractions", tags=["attractions"])
app.include_router(restaurants.router, prefix="/api/v1/restaurants", tags=["restaurants"])
app.include_router(cities.router, prefix="/api/v1/cities", tags=["cities"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["analytics"])


@app.get("/")
async def root():
    return {"message": "Itinera API", "version": settings.APP_VERSION, "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}