import os, json, math, requests
BASE = os.environ["LLM_BASE_URL"].rstrip("/")
H = {"Authorization": f"Bearer {os.environ['LLM_API_KEY']}"}
idx = json.load(open("data/index.json"))

def emb(q):
    r = requests.post(f"{BASE}/api/embed", headers=H,
                      json={"model": "nomic-embed-text", "input": "search_query: " + q}, timeout=60)
    v = r.json()["embeddings"][0]
    n = math.sqrt(sum(x * x for x in v))
    return [x / n for x in v]

for q in ["A student needs help with writing",
          "how to refer to writing studio",
          "student struggling in chemistry",
          "first gen student needs support",
          "How do I set up an Early Alert campaign?",
          "What should GSU 1010 instructors know?"]:
    v = emb(q)
    top = sorted(((sum(a * b for a, b in zip(v, r["embedding"])), r["source"], r["text"][:50].replace("\n", " "))
                  for r in idx), reverse=True)[:3]
    print(q)
    for s, src, t in top:
        print(f"   {s:.3f}  {src}  |  {t}")
