import json
import faiss
import numpy as np
import pickle
from sentence_transformers import SentenceTransformer

# =============================================
# FAISS DB 구축 스크립트
# legal_chunks.json → FAISS DB 변환
# =============================================

# 1. 법령 텍스트 로드
with open("legal_data/legal_chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(f"총 {len(chunks)}개 청크 로드 완료")

# 2. 텍스트 추출
texts = [chunk["content"] for chunk in chunks]

# 3. 텍스트 벡터화
print("벡터화 시작...")
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")
embeddings = model.encode(texts, show_progress_bar=True)
embeddings = np.array(embeddings).astype("float32")

print(f"벡터화 완료: {embeddings.shape}")

# 4. FAISS DB 생성 및 저장
dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)
index.add(embeddings)

faiss.write_index(index, "legal_data/legal_index.faiss")
print("FAISS 인덱스 저장 완료")

# 5. 청크 메타데이터 저장 (검색 결과와 매핑용)
with open("legal_data/legal_chunks_meta.pkl", "wb") as f:
    pickle.dump(chunks, f)

print("메타데이터 저장 완료")
print("FAISS DB 구축 완료!")