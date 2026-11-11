import json,re, os, sys, math, requests
from pathlib import Path
from pypdf import PdfReader
from qr_test import qr_links

BASE = os.environ["LLM_BASE_URL"].rstrip("/")
HEADERS = {"Authorization": f"Bearer {os.environ.get('LLM_API_KEY', '')}"}
MODEL = "nomic-embed-text"
CHUNK, OVERLAP = 600,120

def chunks(text):
    text = " ".join(text.split())
    i = 0
    while i < len(text):
        yield text[i:i + CHUNK]
        i += CHUNK - OVERLAP

def embed(texts):
    r = requests.post(f"{BASE}/api/embed", headers=HEADERS,
                      json={"model": MODEL, "input": texts}, timeout=600)
    r.raise_for_status()
    return r.json()["embeddings"]

def norm(v):
    n = math.sqrt(sum(x * x for x in v)) or 1
    return [round(x / n, 5) for x in v]

records = []
for pdf in sorted(Path("docs").glob("*.pdf")):
    qrs = qr_links(pdf)
    for pageno, page in enumerate(PdfReader(pdf).pages, 1):
        text = page.extract_text() or ""
        if pageno in qrs:
            text += " QR code links on this page: " + ", ".join(qrs[pageno])
        for c in chunks(text):
            if len(c) > 50:
                records.append({"source": pdf.name, "page": pageno, "text": c})
    print(f"read {pdf.name}")

for md in sorted(Path("docs").glob("*.md")):
    for part in re.split(r"^## ", md.read_text(), flags=re.M)[1:]:
        text = " ".join(part.split())
        if len(text) > 30:
            records.append({"source": md.name, "page": None, "text": text})
    print(f"read {md.name}")

if not records:
    sys.exit("No text extracted. Are the PDFs scanned images?")

B = 16
for i in range(0, len(records), B):
    batch = records[i:i + B]
    vecs = embed(["search_document: " + r["text"] for r in batch])
    for r, v in zip(batch, vecs):
        r["embedding"] = norm(v)
    print(f"embedded {min(i + B, len(records))}/{len(records)}")

Path("data").mkdir(exist_ok=True)
Path("data/index.json").write_text(json.dumps(records))
print(f"Wrote {len(records)} chunks to data/index.json")
