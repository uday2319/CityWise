import pandas as pd
import numpy as np
import os
import re
import json

RAW_DIR = "data/raw"
PROCESSED_DIR = "data/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)


def clean_attractions() -> pd.DataFrame:
    """
    Clean tourist attractions dataset.
    Standardizes columns, handles missing values,
    extracts city and coordinates where available.
    """
    # Try multiple common filename variants
    candidates = [
        "Top Indian Places to Visit.csv",
        "top_indian_places_to_visit.csv",
        "indian_tourism.csv",
    ]
    df = None
    for name in candidates:
        path = os.path.join(RAW_DIR, name)
        if os.path.exists(path):
            df = pd.read_csv(path)
            print(f"  Loaded attractions: {path}")
            break

    if df is None:
        raise FileNotFoundError(
            "Tourist attractions CSV not found in data/raw/. "
            "Please download from Kaggle and place in data/raw/"
        )

    print(f"  Raw attractions shape: {df.shape}")
    print(f"  Columns: {df.columns.tolist()}")

    # Normalize column names to lowercase with underscores
    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    df = df.loc[:, ~df.columns.duplicated()]

    df.reset_index(drop=True, inplace=True)

    # Rename known columns to our standard schema
    rename_map = {
        "name": "attraction_name",
        "place_name": "attraction_name",
        "city": "city",
        "state": "state",
        "type": "category",
        "significance": "category",
        "time_needed_to_visit_in_hrs": "visit_duration_hours",
        "entrance_fee_in_inr": "entrance_fee",
        "google_review_rating": "rating",
        "number_of_google_review_in_lakhs": "review_count_lakhs",
        "best_time_to_visit": "best_time",
        "dslr_allowed": "dslr_allowed",
        "zone": "zone",
        "latitude": "latitude",
        "longitude": "longitude",
    }
    df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns}, inplace=True)

    df = df.loc[:, ~df.columns.duplicated()]
    
    # Ensure required columns exist
    required_cols = ["attraction_name", "city", "state", "category", "rating"]
    for col in required_cols:
        if col not in df.columns:
            df[col] = "Unknown"

    # Clean numeric columns
    for col in ["rating", "entrance_fee", "visit_duration_hours"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    # Fill missing ratings with median
    df["rating"] = df["rating"].fillna(df["rating"].median())
    df["entrance_fee"] = df["entrance_fee"].fillna(0)
    df["visit_duration_hours"] = df["visit_duration_hours"].fillna(2.0)

    # Create a combined text field for semantic search
    df["combined_text"] = (
        df["attraction_name"].fillna("").astype(str)
        + " "
        + df["city"].fillna("").astype(str)
        + " "
        + df["state"].fillna("").astype(str)
        + " "
        + df["category"].fillna("").astype(str)
    )

    # Add placeholder coordinates if not present
    if "latitude" not in df.columns:
        df["latitude"] = np.nan
    if "longitude" not in df.columns:
        df["longitude"] = np.nan

    # Drop fully duplicate rows
    df.drop_duplicates(subset=["attraction_name", "city"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    df["attraction_id"] = df.index

    print(f"  Processed attractions shape: {df.shape}")
    return df


def clean_restaurants() -> pd.DataFrame:
    """
    Clean Zomato restaurants dataset.
    Extracts city, cuisine, cost, and rating information.
    """
    path = os.path.join(RAW_DIR, "zomato.csv")
    if not os.path.exists(path):
        # Try alternate names
        for name in os.listdir(RAW_DIR):
            if "zomato" in name.lower():
                path = os.path.join(RAW_DIR, name)
                break

    df = pd.read_csv(path, encoding="latin-1")
    print(f"\n  Raw restaurants shape: {df.shape}")
    print(f"  Columns: {df.columns.tolist()}")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
    df = df.loc[:, ~df.columns.duplicated()]

    rename_map = {
        "name": "restaurant_name",
        "res_name": "restaurant_name",
        "city": "city",
        "cuisines": "cuisine",
        "average_cost_for_two": "cost_for_two",
        "aggregate_rating": "rating",
        "votes": "votes",
        "location": "area",
        "locality": "area",
        "latitude": "latitude",
        "longitude": "longitude",
    }
    df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns}, inplace=True)

    for col in ["rating", "cost_for_two", "votes"]:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df["rating"] = df["rating"].fillna(3.0)
    df["cost_for_two"] = df["cost_for_two"].fillna(500)
    df["votes"] = df["votes"].fillna(0)

    # Only keep restaurants with a valid city
    if "city" in df.columns:
        df = df[df["city"].notna() & (df["city"] != "")]

    df["combined_text"] = (
        df.get("restaurant_name", pd.Series([""] * len(df))).fillna("").astype(str)
        + " "
        + df.get("cuisine", pd.Series([""] * len(df))).fillna("").astype(str)
        + " "
        + df.get("city", pd.Series([""] * len(df))).fillna("").astype(str)
    )

    if "latitude" not in df.columns:
        df["latitude"] = np.nan
    if "longitude" not in df.columns:
        df["longitude"] = np.nan

    df.drop_duplicates(subset=["restaurant_name", "city"] if "city" in df.columns else ["restaurant_name"], inplace=True)
    df.reset_index(drop=True, inplace=True)
    df["restaurant_id"] = df.index

    print(f"  Processed restaurants shape: {df.shape}")
    return df


def clean_cities() -> pd.DataFrame:
    """
    Clean world cities dataset.
    Filter to India, extract lat/lon for geocoding.
    """
    path = os.path.join(RAW_DIR, "worldcities.csv")
    if not os.path.exists(path):
        for name in os.listdir(RAW_DIR):
            if "cities" in name.lower():
                path = os.path.join(RAW_DIR, name)
                break

    df = pd.read_csv(path)
    print(f"\n  Raw cities shape: {df.shape}")

    df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]

    # Filter to India
    india_df = df[df.get("country", df.get("country_name", pd.Series())).str.contains("India", na=False, case=False)].copy()

    if india_df.empty:
        india_df = df.copy()  # fallback: keep all

    rename_map = {
        "city_name": "city",
        "city": "city",
        "name": "city",
        "lat": "latitude",
        "lng": "longitude",
        "latitude": "latitude",
        "longitude": "longitude",
    }
    india_df.rename(columns={k: v for k, v in rename_map.items() if k in india_df.columns}, inplace=True)

    for col in ["latitude", "longitude"]:
        if col in india_df.columns:
            india_df[col] = pd.to_numeric(india_df[col], errors="coerce")

    india_df.drop_duplicates(subset=["city"], inplace=True)
    india_df.reset_index(drop=True, inplace=True)

    print(f"  Processed India cities shape: {india_df.shape}")
    return india_df


def main():
    print("=" * 60)
    print("ITINERA — Dataset Preprocessing")
    print("=" * 60)

    print("\n[1/3] Processing attractions...")
    attractions = clean_attractions()
    out_path = os.path.join(PROCESSED_DIR, "attractions.csv")
    attractions.to_csv(out_path, index=False)
    print(f"  Saved: {out_path}")

    print("\n[2/3] Processing restaurants...")
    restaurants = clean_restaurants()
    out_path = os.path.join(PROCESSED_DIR, "restaurants.csv")
    restaurants.to_csv(out_path, index=False)
    print(f"  Saved: {out_path}")

    print("\n[3/3] Processing cities...")
    cities = clean_cities()
    out_path = os.path.join(PROCESSED_DIR, "cities.csv")
    cities.to_csv(out_path, index=False)
    print(f"  Saved: {out_path}")

    print("\n✓ Preprocessing complete. Files saved to data/processed/")


if __name__ == "__main__":
    main()