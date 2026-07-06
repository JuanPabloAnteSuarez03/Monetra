from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers.ocr_router import router as ocr_router
from routers.movements_router import router as movements_router
from routers.reports_router import router as reports_router
from routers.ai_router import router as ai_router
from routers.predictions_router import router as predictions_router
from routers.savings_goals_router import router as savings_goals_router
from routers.monitoring_router import router as monitoring_router

app = FastAPI(
    title="Monetra App API",
    description="API para gestión de gastos con OCR e IA",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ocr_router)
app.include_router(movements_router,   prefix="/api/movements",     tags=["Movements"])
app.include_router(ai_router,          prefix="/api/ai",            tags=["AI"])
app.include_router(predictions_router, prefix="/api/predictions",   tags=["Predictions"])
app.include_router(reports_router,     prefix="/api/reports",       tags=["Reports"])
app.include_router(savings_goals_router, prefix="/api/savings-goals", tags=["Savings Goals"])
app.include_router(monitoring_router, prefix="/api/monitoring", tags=["Monitoring"])


@app.get("/health")
async def health_check():
    return {"status": "ok"}