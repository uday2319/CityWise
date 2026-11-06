import pandas as pd
import numpy as np
import xgboost as xgb
import pickle
import os
from sklearn.preprocessing import LabelEncoder

PROCESSED_DIR = "data/processed"
MODELS_DIR = "data/models"
os.makedirs(MODELS_DIR, exist_ok=True)


def create_ltr_training_data(attractions: pd.DataFrame) -> tuple:
    """
    Create pairwise learning-to-rank training data.

    Groups: each city is one query group (ranking is relative within a city).
    Labels: 4-level relevance (0–3) derived from quality signals.

    In production, labels would come from user click/visit logs.
    For portfolio: synthetic labels derived from rating, popularity, and fee.
    """
    df = attractions.copy()

    df["rating"] = pd.to_numeric(
        df.get("rating", 3.0), errors="coerce"
    ).fillna(3.0)
    df["popularity_score"] = pd.to_numeric(
        df.get("popularity_score", 50.0), errors="coerce"
    ).fillna(50.0)
    df["entrance_fee"] = pd.to_numeric(
        df.get("entrance_fee", 0), errors="coerce"
    ).fillna(0)
    df["visit_duration_hours"] = pd.to_numeric(
        df.get("visit_duration_hours", 2.0), errors="coerce"
    ).fillna(2.0)

    # Synthetic relevance [0, 1]
    relevance_continuous = (
        0.45 * (df["rating"] / 5.0)
        + 0.35 * (df["popularity_score"] / 100.0)
        + 0.20 * (1 - df["entrance_fee"].clip(0, 500) / 500)
    )

    # Convert to 4 discrete relevance levels
    labels = pd.cut(
        relevance_continuous, bins=4, labels=[0, 1, 2, 3]
    ).astype(int).values

    # Groups: one group per city
    if "city" in df.columns:
        city_groups = df.groupby("city").size().values
    else:
        city_groups = np.array([len(df)])

    return df, labels, city_groups


def extract_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Extract numerical features for XGBRanker.

    Includes budget_fit_score if it exists in the DataFrame
    (it is added by AttractionRecommender.recommend() in v2).
    """
    features = pd.DataFrame()

    features["rating"] = pd.to_numeric(
        df.get("rating", 3.0), errors="coerce"
    ).fillna(3.0)
    features["popularity_score"] = pd.to_numeric(
        df.get("popularity_score", 50.0), errors="coerce"
    ).fillna(50.0)
    features["entrance_fee"] = pd.to_numeric(
        df.get("entrance_fee", 0), errors="coerce"
    ).fillna(0)
    features["visit_duration_hours"] = pd.to_numeric(
        df.get("visit_duration_hours", 2.0), errors="coerce"
    ).fillna(2.0)

    le = LabelEncoder()

    if "budget_tier" in df.columns:
        features["budget_tier_enc"] = le.fit_transform(
            df["budget_tier"].fillna("mid")
        )
    else:
        features["budget_tier_enc"] = 1

    if "recommended_time_slot" in df.columns:
        features["time_slot_enc"] = le.fit_transform(
            df["recommended_time_slot"].fillna("morning")
        )
    else:
        features["time_slot_enc"] = 0

    if "interest_tags_str" in df.columns:
        features["n_interest_tags"] = (
            df["interest_tags_str"].str.count(r"\|").fillna(0) + 1
        )
    else:
        features["n_interest_tags"] = 1

    # semantic_score from SBERT search step
    if "semantic_score" in df.columns:
        features["semantic_score"] = df["semantic_score"].fillna(0.5)
    else:
        features["semantic_score"] = 0.5

    # budget_fit_score from v2 numeric budget filter
    if "budget_fit_score" in df.columns:
        features["budget_fit_score"] = df["budget_fit_score"].fillna(0.5)
    else:
        features["budget_fit_score"] = 0.5

    return features


def train():
    print("=" * 60)
    print("ITINERA — XGBoost Learning-to-Rank Training")
    print("(Gradient Boosting pairwise ranker — matches synopsis)")
    print("=" * 60)

    print("\nLoading data...")
    attractions = pd.read_csv(
        os.path.join(PROCESSED_DIR, "attractions_featured.csv")
    )
    df, labels, groups = create_ltr_training_data(attractions)
    X = extract_features(df)

    print(f"  Samples        : {len(X)}")
    print(f"  Groups (cities): {len(groups)}")
    print(f"  Features       : {X.columns.tolist()}")
    print(f"  Label dist     : {pd.Series(labels).value_counts().sort_index().to_dict()}")

    # ── XGBRanker: correct LTR formulation ────────────────────────────────────
    ranker = xgb.XGBRanker(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        objective="rank:pairwise",
        eval_metric="ndcg",
        random_state=42,
        verbosity=1,
    )

    print("\nTraining XGBRanker (pairwise LTR)...")

    # Train/test split keeping group boundaries
    if len(groups) > 4:
        cumsum = np.cumsum(groups)
        n_train_groups = int(len(groups) * 0.8)
        train_end = cumsum[n_train_groups - 1]
        X_train, X_test = X.iloc[:train_end], X.iloc[train_end:]
        y_train, y_test = labels[:train_end], labels[train_end:]
        g_train = groups[:n_train_groups]
        g_test = groups[n_train_groups:]
    else:
        X_train, X_test = X, X
        y_train, y_test = labels, labels
        g_train, g_test = groups, groups

    ranker.fit(
        X_train, y_train,
        group=g_train,
        eval_set=[(X_test, y_test)],
        eval_group=[g_test],
        verbose=50,
    )

    importance = dict(zip(X.columns, ranker.feature_importances_))
    print("\n  Feature importances:")
    for feat, imp in sorted(importance.items(), key=lambda x: -x[1]):
        print(f"    {feat}: {imp:.4f}")

    model_path = os.path.join(MODELS_DIR, "xgb_ranker.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(ranker, f)
    print(f"\n  Saved: {model_path}")

    with open(os.path.join(MODELS_DIR, "ranker_features.txt"), "w") as f:
        f.write("\n".join(X.columns.tolist()))

    print("✓ XGBRanker (pairwise LTR) trained and saved.")
    return ranker


class AttractionRanker:
    """Load and use the trained XGBRanker at inference time."""

    def __init__(self):
        self.model = None
        self._loaded = False

    def load(self):
        if self._loaded:
            return
        model_path = os.path.join(MODELS_DIR, "xgb_ranker.pkl")
        if not os.path.exists(model_path):
            print("  XGBRanker model not found, using fallback scoring")
            return
        with open(model_path, "rb") as f:
            self.model = pickle.load(f)
        self._loaded = True
        print("  XGBRanker loaded")

    def rerank(self, candidates: pd.DataFrame) -> pd.DataFrame:
   
        if not self._loaded or self.model is None:
            if "final_score" in candidates.columns:
                return candidates.sort_values("final_score", ascending=False)
            return candidates

        # Full feature set (includes semantic_score & budget_fit_score)
        X_full = extract_features(candidates)

         # ✅ ONLY use training features for XGBoost
        TRAINING_FEATURES = [
            "rating",
            "popularity_score",
            "entrance_fee",
            "visit_duration_hours",
            "budget_tier_enc",
            "time_slot_enc",
            "n_interest_tags",
        ]

        X_model = X_full[TRAINING_FEATURES]

        # Predict using ONLY valid features
        xgb_scores = self.model.predict(X_model)

        candidates = candidates.copy()
        candidates["xgb_score"] = xgb_scores

    # Normalize
        xgb_min, xgb_max = xgb_scores.min(), xgb_scores.max()
        if xgb_max > xgb_min:
            xgb_norm = (xgb_scores - xgb_min) / (xgb_max - xgb_min)
        else:
            xgb_norm = np.ones(len(xgb_scores)) * 0.5

        # Get semantic score (already computed earlier)
        sem_score = candidates.get(
            "final_score", pd.Series([0.5] * len(candidates))
        ).values

        # Get budget fit score
        budget_fit = candidates.get(
            "budget_fit_score", pd.Series([0.5] * len(candidates))
        ).values

        # Final combined score (V2 logic)
        candidates["final_score"] = (
            0.55 * sem_score
            + 0.35 * xgb_norm
            + 0.10 * budget_fit
        )

        return candidates.sort_values("final_score", ascending=False)


if __name__ == "__main__":
    train()