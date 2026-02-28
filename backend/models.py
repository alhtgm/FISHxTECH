from datetime import datetime
from sqlalchemy import Column, Integer, String, BigInteger, DateTime
from database import Base


class ScoreRecord(Base):
    __tablename__ = "scores"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(50), nullable=False)
    score = Column(BigInteger, nullable=False)
    difficulty = Column(String(10), nullable=False)
    level = Column(Integer, nullable=False)
    total_profit = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
