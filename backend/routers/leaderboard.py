import re
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from database import get_db
from models import ScoreRecord

router = APIRouter()

# 不適切文字のシンプルフィルタ（英数字・ひらがな・カタカナ・漢字・記号一部を許可）
ALLOWED_NAME_PATTERN = re.compile(r'^[\w\u3040-\u30ff\u4e00-\u9fff（）()・\-\s]{1,20}$')


class ScoreInput(BaseModel):
    companyName: str
    score: int
    difficulty: str
    level: int
    totalProfit: int

    @field_validator('companyName')
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('会社名は必須です')
        if len(v) > 20:
            raise ValueError('会社名は20文字以内にしてください')
        if not ALLOWED_NAME_PATTERN.match(v):
            raise ValueError('使用できない文字が含まれています')
        return v

    @field_validator('score')
    @classmethod
    def validate_score(cls, v: int) -> int:
        if v < 0 or v > 999_999_999:
            raise ValueError('不正なスコア値です')
        return v

    @field_validator('difficulty')
    @classmethod
    def validate_difficulty(cls, v: str) -> str:
        if v not in ('normal', 'hard'):
            raise ValueError('難易度が不正です')
        return v

    @field_validator('level')
    @classmethod
    def validate_level(cls, v: int) -> int:
        if v < 1 or v > 5:
            raise ValueError('レベルが不正です')
        return v


class ScoreOutput(BaseModel):
    rank: int
    companyName: str
    score: int
    difficulty: str
    level: int
    totalProfit: int
    createdAt: str


@router.post("/score", status_code=201)
def submit_score(data: ScoreInput, db: Session = Depends(get_db)):
    record = ScoreRecord(
        company_name=data.companyName,
        score=data.score,
        difficulty=data.difficulty,
        level=data.level,
        total_profit=data.totalProfit,
        created_at=datetime.utcnow(),
    )
    db.add(record)
    db.commit()
    return {"message": "スコアを登録しました"}


@router.get("/leaderboard", response_model=list[ScoreOutput])
def get_leaderboard(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db)
):
    records = (
        db.query(ScoreRecord)
        .order_by(ScoreRecord.score.desc())
        .limit(limit)
        .all()
    )
    return [
        ScoreOutput(
            rank=i + 1,
            companyName=r.company_name,
            score=r.score,
            difficulty=r.difficulty,
            level=r.level,
            totalProfit=r.total_profit,
            createdAt=r.created_at.isoformat() if r.created_at else "",
        )
        for i, r in enumerate(records)
    ]
