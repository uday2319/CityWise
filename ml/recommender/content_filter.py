import pandas as pd
import numpy as np
from typing import Optional


def filter_by_budget(df: pd.DataFrame, max_budget_per_day: float) -> pd.DataFrame:
    """Filter attractions to fit within daily budget."""
    if "entrance_fee" not in df.columns:
        return df
    return df[df["entrance_fee"].fillna(0) <= max_budget_per_day * 0.3]


def ensure_diversity(df: pd.DataFrame, n_per_category: int = 2) -> pd.DataFrame:
    """
    Ensure category diversity — don't recommend 5 forts and nothing else.
    Takes up to n_per_category from each category.
    """
    if "category" not in df.columns:
        return df

    result = []
    category_counts = {}

    for _, row in df.iterrows():
        cat = str(row.get("category", "general"))
        count = category_counts.get(cat, 0)
        if count < n_per_category:
            result.append(row)
            category_counts[cat] = count + 1

    if len(result) < len(df) // 2:
        return df  # diversity would reduce too much, skip

    return pd.DataFrame(result)


def apply_time_slot_distribution(
    attractions: pd.DataFrame, slots_per_day: int = 3
) -> pd.DataFrame:
    """
    Assign time slots (morning/afternoon/evening) to attractions.
    Ensures each day has a balanced schedule.
    """
    df = attractions.copy()
    if "recommended_time_slot" not in df.columns:
        df["recommended_time_slot"] = "morning"

    # Prioritize morning > afternoon > evening
    slot_order = {"morning": 0, "afternoon": 1, "evening": 2}
    df["slot_order"] = df["recommended_time_slot"].map(slot_order).fillna(1)
    df = df.sort_values(["slot_order", "final_score"], ascending=[True, False])
    return df