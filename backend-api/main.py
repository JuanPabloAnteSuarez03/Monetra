from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

load_dotenv()

from routers.movements_router import router as movements_router
from routers.savings_goals_router import router as savings_goals_router

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

app.include_router(movements_router,   prefix="/api/movements",     tags=["Movements"])
app.include_router(savings_goals_router, prefix="/api/savings-goals", tags=["Savings Goals"])

@app.get("/health")
async def health_check():
    return {"status": "ok"}