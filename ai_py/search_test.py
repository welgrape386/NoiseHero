import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer

# =============================================
# FAISS 검색 테스트
# =============================================

# 1. 모델 및 DB 로드
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
index = faiss.read_index("legal_data/legal_index.faiss")

with open("legal_data/legal_chunks_meta.pkl", "rb") as f:
    chunks = pickle.load(f)

print("FAISS DB 로드 완료!")

def search(query, top_k=3):
    # 질문을 벡터로 변환
    query_vector = model.encode([query]).astype("float32")
    
    # FAISS 검색
    distances, indices = index.search(query_vector, top_k)
    
    results = []
    for i, idx in enumerate(indices[0]):
        results.append({
            "rank": i + 1,
            "source": chunks[idx]["source"],
            "category": chunks[idx]["category"],
            "content": chunks[idx]["content"][:200],  # 200자만 출력
            "distance": distances[0][i]
        })
    return results

# 테스트 질문들
test_queries = [
    "야간 층간소음 기준이 뭐야?",
    "층간소음 신고 절차 알려줘",
    "발소리가 층간소음이야?"
]

for query in test_queries:
    print(f"\n질문: {query}")
    print("-" * 50)
    results = search(query)
    for r in results:
        print(f"[{r['rank']}위] {r['source']}")
        print(f"내용: {r['content']}...")
        print()
        