import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Monetra API", version="0.1.0")

# CORS setup
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3100").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"message": "Monetra backend funcionando"}
