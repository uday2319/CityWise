import pandas as pd
import numpy as np
import os
import json

PROCESSED_DIR = "data/processed"


# Interest categories that users can select
INTEREST_CATEGORIES = {
    "history": ["historical", "fort", "palace", "monument", "museum", "heritage", "ruins", "temple", "ancient"],
    "culture": ["cultural", "art", "festival", "tradition", "folk", "craft", "gallery", "performing"],
    "nature": ["nature", "park", "garden", "wildlife", "forest", "beach", "lake", "mountain", "waterfall", "trek"],
    "food": ["food", "market", "street_food", "cuisine", "restaurant", "bazaar"],
    "adventure": ["adventure", "trek", "rafting", "paragliding", "camping", "zip_line", "climbing"],
    "spiritual": ["temple", "mosque", "church", "shrine", "pilgrimage", "spiritual", "religious"],
    "shopping": ["market", "mall", "bazaar", "handicraft", "emporium", "shop"],
    "architecture": ["architecture", "building", "monument", "palace", "fort", "step_well"],
}


def assign_interest_tags(row: pd.Series) -> list:
    """
    Assign interest tags to an attraction based on its category and name.
    Returns a list of matching interest categories.
    """
    text = str(row.get("combined_text", "")).lower()
    tags = []
    for interest, keywords in INTEREST_CATEGORIES.items():
        if any(kw in text for kw in keywords):
            tags.append(interest)
    return tags if tags else ["general"]


def assign_budget_tier(fee: float) -> str:
    """Classify attraction into budget tiers based on entrance fee."""
    if pd.isna(fee) or fee == 0:
        return "free"
    elif fee < 50:
        return "budget"
    elif fee < 200:
        return "mid"
    else:
        return "premium"


def engineer_attraction_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add ML-ready features to the attractions dataframe."""
    df = df.copy()

    # Interest tags
    df["interest_tags"] = df.apply(assign_interest_tags, axis=1)
    df["interest_tags_str"] = df["interest_tags"].apply(lambda x: "|".join(x))

    # Budget tier
    df["budget_tier"] = df.get("entrance_fee", pd.Series([0] * len(df))).apply(assign_budget_tier)

    # Popularity score (normalized rating * log(review_count + 1))
    rating_col = "rating" if "rating" in df.columns else None
    if rating_col:
        review_col = "review_count_lakhs" if "review_count_lakhs" in df.columns else None
        if review_col:
            df["popularity_score"] = (
                df["rating"].fillna(3.0) * np.log1p(df["review_count_lakhs"].fillna(0) * 100000)
            )
        else:
            df["popularity_score"] = df["rating"].fillna(3.0) * 10
    else:
        df["popularity_score"] = 50.0

    # Normalize popularity score to [0, 100]
    pop_max = df["popularity_score"].max()
    if pop_max > 0:
        df["popularity_score"] = (df["popularity_score"] / pop_max) * 100

    # Visit time slot recommendation (morning, afternoon, evening)
    def recommend_time_slot(row):
        name_lower = str(row.get("attraction_name", "")).lower()
        tags = row.get("interest_tags", [])
        if "nature" in tags or "park" in name_lower or "garden" in name_lower:
            return "morning"
        elif "food" in tags or "market" in name_lower:
            return "evening"
        elif "fort" in name_lower or "palace" in name_lower:
            return "morning"
        else:
            return "afternoon"

    df["recommended_time_slot"] = df.apply(recommend_time_slot, axis=1)

    print(f"  Engineered features for {len(df)} attractions")
    print(f"  Budget tiers: {df['budget_tier'].value_counts().to_dict()}")
    return df


def engineer_restaurant_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add ML-ready features to the restaurants dataframe."""
    df = df.copy()

    # Meal time classification
    def classify_meal_type(cuisine_str: str) -> str:
        cuisine = str(cuisine_str).lower()
        if any(w in cuisine for w in ["café", "cafe", "coffee", "bakery", "breakfast"]):
            return "breakfast"
        elif any(w in cuisine for w in ["bar", "pub", "lounge", "rooftop"]):
            return "dinner"
        else:
            return "lunch_dinner"

    cuisine_col = "cuisine" if "cuisine" in df.columns else None
    if cuisine_col:
        df["meal_type"] = df["cuisine"].apply(classify_meal_type)
    else:
        df["meal_type"] = "lunch_dinner"

    # Budget tier based on cost for two
    def restaurant_budget(cost):
        if pd.isna(cost) or cost < 200:
            return "budget"
        elif cost < 800:
            return "mid"
        else:
            return "premium"

    df["budget_tier"] = df.get("cost_for_two", pd.Series([500] * len(df))).apply(restaurant_budget)

    return df


def main():
    print("=" * 60)
    print("ITINERA — Feature Engineering")
    print("=" * 60)

    print("\n[1/2] Engineering attraction features...")
    attractions = pd.read_csv(os.path.join(PROCESSED_DIR, "attractions.csv"))
    attractions = engineer_attraction_features(attractions)
    attractions.to_csv(os.path.join(PROCESSED_DIR, "attractions_featured.csv"), index=False)
    print("  Saved: data/processed/attractions_featured.csv")

    print("\n[2/2] Engineering restaurant features...")
    restaurants = pd.read_csv(os.path.join(PROCESSED_DIR, "restaurants.csv"))
    restaurants = engineer_restaurant_features(restaurants)
    restaurants.to_csv(os.path.join(PROCESSED_DIR, "restaurants_featured.csv"), index=False)
    print("  Saved: data/processed/restaurants_featured.csv")

    print("\n✓ Feature engineering complete.")


if __name__ == "__main__":
    main()