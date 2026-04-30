import faiss
import numpy as np
import os
import pickle

MODELS_DIR = "data/models"


def build_faiss_index(embeddings: np.ndarray, use_ivf: bool = False) -> faiss.Index:
    """
    Build a FAISS index from embedding vectors.
    
    For small datasets (<10k): use flat L2 index (exact, fast enough)
    For large datasets (>10k): use IVF index (approximate, much faster)
    
    Args:
        embeddings: numpy array of shape (n, embedding_dim), float32
        use_ivf: Whether to use IVF (approximate) index
    
    Returns:
        Built and populated FAISS index
    """
    n, dim = embeddings.shape
    assert embeddings.dtype == np.float32, "Embeddings must be float32"

    if use_ivf and n > 1000:
        # IVFFlat: clusters vectors into n_clusters, searches only nearby clusters
        n_clusters = min(int(np.sqrt(n)), 100)
        quantizer = faiss.IndexFlatL2(dim)
        index = faiss.IndexIVFFlat(quantizer, dim, n_clusters, faiss.METRIC_INNER_PRODUCT)
        index.train(embeddings)
        print(f"  Built IVFFlat index: {n} vectors, {n_clusters} clusters")
    else:
        # Exact inner product (cosine similarity since vectors are L2-normalized)
        index = faiss.IndexFlatIP(dim)
        print(f"  Built FlatIP index: {n} vectors, {dim} dims")

    index.add(embeddings)
    return index


def save_index(index: faiss.Index, name: str):
    """Save FAISS index to disk."""
    path = os.path.join(MODELS_DIR, f"{name}.faiss")
    faiss.write_index(index, path)
    print(f"  Saved index: {path}")


def load_index(name: str) -> faiss.Index:
    """Load FAISS index from disk."""
    path = os.path.join(MODELS_DIR, f"{name}.faiss")
    if not os.path.exists(path):
        raise FileNotFoundError(f"FAISS index not found: {path}. Run generate_embeddings.py first.")
    return faiss.read_index(path)


def search_index(
    index: faiss.Index,
    query_embedding: np.ndarray,
    top_k: int = 20,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Search FAISS index for nearest neighbors.
    
    Args:
        index: FAISS index
        query_embedding: shape (1, dim) or (dim,)
        top_k: number of results
    
    Returns:
        (distances, indices) both shape (1, top_k)
    """
    if query_embedding.ndim == 1:
        query_embedding = query_embedding.reshape(1, -1)
    query_embedding = query_embedding.astype(np.float32)

    # Normalize query for cosine similarity
    faiss.normalize_L2(query_embedding)

    distances, indices = index.search(query_embedding, top_k)
    return distances, indices


def build_and_save_all():
    """Build FAISS indexes for all embeddings and save them."""
    print("=" * 60)
    print("ITINERA — Building FAISS Indexes")
    print("=" * 60)

    for name in ["attraction", "restaurant"]:
        emb_path = os.path.join(MODELS_DIR, f"{name}_embeddings.npy")
        if not os.path.exists(emb_path):
            print(f"  Skipping {name}: embeddings not found")
            continue

        print(f"\nBuilding {name} index...")
        embeddings = np.load(emb_path).astype(np.float32)

        # Normalize for inner product = cosine similarity
        faiss.normalize_L2(embeddings)

        use_ivf = len(embeddings) > 1000
        index = build_faiss_index(embeddings, use_ivf=use_ivf)
        save_index(index, f"{name}_index")

    print("\n✓ All FAISS indexes built.")


if __name__ == "__main__":
    build_and_save_all()