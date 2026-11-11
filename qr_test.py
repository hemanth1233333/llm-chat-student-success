import fitz, cv2, numpy as np
from pathlib import Path

def qr_links(pdf_path, dpi=200):
    out, det = {}, cv2.QRCodeDetector()
    for i, page in enumerate(fitz.open(pdf_path), 1):
        pix = page.get_pixmap(dpi=dpi)
        img = np.frombuffer(pix.samples, np.uint8).reshape(pix.h, pix.w, pix.n)
        if pix.n == 4:
            img = cv2.cvtColor(img, cv2.COLOR_RGBA2BGR)
        elif pix.n == 3:
            img = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        ok, vals, _, _ = det.detectAndDecodeMulti(img)
        links = [v for v in vals if v] if ok else []
        if links:
            out[i] = links
    return out

if __name__ == "__main__":
    for pdf in sorted(Path("docs").glob("*.pdf")):
        print(pdf.name, qr_links(pdf) or "no QR codes found")
