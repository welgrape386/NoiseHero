import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer

# =============================================
# FAISS 기반 법령 검색 모듈
# chatbot.py, generate_report.py 둘 다 여기서 법령 가져감
# =============================================

_model = None
_index = None
_chunks = None

def _load():
    global _model, _index, _chunks
    if _model is None:
        _model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
        _index = faiss.read_index("legal_data/legal_index.faiss")
        with open("legal_data/legal_chunks_meta.pkl", "rb") as f:
            _chunks = pickle.load(f)

def search_legal(query, top_k=3):
    _load()
    query_vector = _model.encode([query]).astype("float32")
    distances, indices = _index.search(query_vector, top_k)
    results = []
    for idx in indices[0]:
        results.append(_chunks[idx]["content"])
    return "\n\n".join(results)