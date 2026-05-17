from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from backend.database import connect_db, close_db
from backend.routers import auth, incidents, reports, performance, dashboard

@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    print("Started")
    yield
    await close_db()
    print("Stopped")

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # later restrict to React URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ONLY APIs
app.include_router(auth.router)
app.include_router(incidents.router)
app.include_router(reports.router)
app.include_router(performance.router)
app.include_router(dashboard.router)

@app.get("/health")
async def health():
    return {"status": "running"}