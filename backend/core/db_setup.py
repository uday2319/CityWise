import asyncio
import pandas as pd
import numpy as np
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from backend.core.database import Base, sync_engine, AsyncSessionLocal
from backend.core.config import settings
from backend.models.attraction import Attraction
from backend.models.restaurant import Restaurant
from backend.models.itinerary import Itinerary


def create_tables():
    """Create all tables (sync, for initial setup)."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    engine = create_engine(settings.DATABASE_URL_SYNC)

    # Enable pgvector extension
    with engine.connect() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
        print("  pgvector extension enabled")

    Base.metadata.create_all(engine)
    print("  Tables created")


def load_attractions():
    """Load attractions CSV into database."""
    from sqlalchemy.orm import Session
    from sqlalchemy import create_engine

    engine = create_engine(settings.DATABASE_URL_SYNC)
    df = pd.read_csv("data/processed/attractions_featured.csv")

    with Session(engine) as session:
        # Clear existing data
        session.query(Attraction).delete()

        records = []
        for _, row in df.iterrows():
            tags = str(row.get("interest_tags_str", "")).split("|")
            tags = [t for t in tags if t and t != "nan"]

            records.append(Attraction(
                attraction_name=str(row.get("attraction_name", "")),
                city=str(row.get("city", "")),
                state=str(row.get("state", "")),
                category=str(row.get("category", "")),
                rating=float(row.get("rating", 3.0)),
                entrance_fee=float(row.get("entrance_fee", 0)),
                visit_duration_hours=float(row.get("visit_duration_hours", 2.0)),
                latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                budget_tier=str(row.get("budget_tier", "mid")),
                interest_tags=tags,
                popularity_score=float(row.get("popularity_score", 50.0)),
                recommended_time_slot=str(row.get("recommended_time_slot", "morning")),
                combined_text=str(row.get("combined_text", "")),
            ))

        session.add_all(records)
        session.commit()
        print(f"  Loaded {len(records)} attractions")


def load_restaurants():
    """Load restaurants CSV into database."""
    from sqlalchemy.orm import Session
    from sqlalchemy import create_engine

    engine = create_engine(settings.DATABASE_URL_SYNC)
    df = pd.read_csv("data/processed/restaurants_featured.csv")

    with Session(engine) as session:
        session.query(Restaurant).delete()

        records = []
        for _, row in df.iterrows():
            records.append(Restaurant(
                restaurant_name=str(row.get("restaurant_name", "")),
                city=str(row.get("city", "")),
                area=str(row.get("area", "")),
                cuisine=str(row.get("cuisine", "")),
                rating=float(row.get("rating", 3.0)),
                cost_for_two=float(row.get("cost_for_two", 400)),
                votes=int(row.get("votes", 0)),
                latitude=float(row["latitude"]) if pd.notna(row.get("latitude")) else None,
                longitude=float(row["longitude"]) if pd.notna(row.get("longitude")) else None,
                budget_tier=str(row.get("budget_tier", "mid")),
                meal_type=str(row.get("meal_type", "lunch_dinner")),
                combined_text=str(row.get("combined_text", "")),
            ))

        session.add_all(records)
        session.commit()
        print(f"  Loaded {len(records)} restaurants")


if __name__ == "__main__":
    print("Setting up database...")
    create_tables()
    load_attractions()
    load_restaurants()
    print("✓ Database setup complete.")