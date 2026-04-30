import pandas as pd
import numpy as np
import os
import time
from sentence_transformers import SentenceTransformer

PROCESSED_DIR = "data/processed"
MODELS_DIR = "data/models"
os.makedirs(MODELS_DIR, exist_ok=True)

# Use a fast, lightweight model
# First run will download ~80MB model from HuggingFace
SBERT_MODEL = "all-MiniLM-L6-v2"


def generate_embeddings(
    texts: list[str],
    model: SentenceTransformer,
    batch_size: int = 64,
    show_progress: bool = True,
) -> np.ndarray:
    """
    Generate embeddings for a list of texts.
    
    Args:
        texts: List of text strings to embed
        model: Loaded SentenceTransformer model
        batch_size: Number of texts to process at once
        show_progress: Show progress bar
    
    Returns:
        numpy array of shape (n_texts, embedding_dim)
    """
    print(f"  Generating embeddings for {len(texts)} texts...")
    start = time.time()

    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=show_progress,
        normalize_embeddings=True,  # L2 normalize for cosine similarity
        convert_to_numpy=True,
    )

    elapsed = time.time() - start
    print(f"  Done in {elapsed:.1f}s. Shape: {embeddings.shape}")
    return embeddings.astype(np.float32)


def main():
    print("=" * 60)
    print("ITINERA — SBERT Embedding Generation")
    print("=" * 60)

    print(f"\nLoading SBERT model: {SBERT_MODEL}")
    print("(First run downloads ~80MB — this is normal)")
    model = SentenceTransformer(SBERT_MODEL)
    print(f"Model loaded. Embedding dimension: {model.get_sentence_embedding_dimension()}")

    # ── Attractions ──────────────────────────────────────────────
    print("\n[1/2] Generating attraction embeddings...")
    attractions = pd.read_csv(os.path.join(PROCESSED_DIR, "attractions_featured.csv"))

    # Build rich text for embedding
    def build_attraction_text(row):
        parts = [
            str(row.get("attraction_name", "")),
            str(row.get("city", "")),
            str(row.get("state", "")),
            str(row.get("category", "")),
            str(row.get("interest_tags_str", "")).replace("|", " "),
        ]
        return " ".join(p for p in parts if p and p != "nan")

    attraction_texts = attractions.apply(build_attraction_text, axis=1).tolist()
    attraction_embeddings = generate_embeddings(attraction_texts, model)

    np.save(os.path.join(MODELS_DIR, "attraction_embeddings.npy"), attraction_embeddings)
    attractions["embedding_index"] = range(len(attractions))
    attractions.to_csv(os.path.join(PROCESSED_DIR, "attractions_featured.csv"), index=False)
    print(f"  Saved: data/models/attraction_embeddings.npy")

    # ── Restaurants ──────────────────────────────────────────────
    print("\n[2/2] Generating restaurant embeddings...")
    restaurants = pd.read_csv(os.path.join(PROCESSED_DIR, "restaurants_featured.csv"))

    def build_restaurant_text(row):
        parts = [
            str(row.get("restaurant_name", "")),
            str(row.get("cuisine", "")),
            str(row.get("city", "")),
            str(row.get("area", "")),
            str(row.get("budget_tier", "")),
        ]
        return " ".join(p for p in parts if p and p != "nan")

    restaurant_texts = restaurants.apply(build_restaurant_text, axis=1).tolist()
    restaurant_embeddings = generate_embeddings(restaurant_texts, model)

    np.save(os.path.join(MODELS_DIR, "restaurant_embeddings.npy"), restaurant_embeddings)
    print(f"  Saved: data/models/restaurant_embeddings.npy")

    # ── Save interest query embeddings ────────────────────────────
    print("\n[Bonus] Pre-computing interest query embeddings...")
    interest_queries = {
        "history": "historical monuments ancient ruins heritage sites forts palaces",
        "culture": "cultural art gallery museum folk tradition craft festival",
        "nature": "nature park garden wildlife forest beach lake mountain waterfall",
        "food": "food street food market cuisine local restaurants bazaar",
        "adventure": "adventure trekking rafting paragliding camping outdoor activities",
        "spiritual": "temple mosque church shrine pilgrimage spiritual religious",
        "shopping": "shopping market mall bazaar handicraft emporium",
        "architecture": "architecture building monument palace fort step well",
    }

    interest_texts = list(interest_queries.values())
    interest_keys = list(interest_queries.keys())
    interest_embeddings = generate_embeddings(interest_texts, model, show_progress=False)

    np.save(os.path.join(MODELS_DIR, "interest_embeddings.npy"), interest_embeddings)

    import json
    with open(os.path.join(MODELS_DIR, "interest_keys.json"), "w") as f:
        json.dump(interest_keys, f)

    print(f"  Saved: data/models/interest_embeddings.npy")
    print("\n✓ All embeddings generated successfully.")


if __name__ == "__main__":
    main()