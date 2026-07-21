import json
import os

_chunks = None

def _load():
    global _chunks
    if _chunks is None:
        with open("legal_data/legal_chunks.json", "r", encoding="utf-8") as f:
            _chunks = json.load(f)

def search_legal(query, top_k=3):
    _load()
    results = []
    for chunk in _chunks:
        if any(keyword in chunk["content"] for keyword in query.split()):
            results.append(chunk["content"])
        if len(results) >= top_k:
            break
    
    if not results:
        results = [_chunks[0]["content"]]
    
    return "\n\n".join(results)