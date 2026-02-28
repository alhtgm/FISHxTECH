from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers.leaderboard import router as leaderboard_router

# テーブル作成
Base.metadata.create_all(bind=engine)

app = FastAPI(title="FISHxTECH API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:4173"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

app.include_router(leaderboard_router, prefix="")


@app.get("/health")
def health():
    return {"status": "ok"}
