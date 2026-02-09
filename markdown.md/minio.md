# 🇻🇳 CRALWING_SOURCES.md — Job Crawling Sources (Vietnam)

> **Mục tiêu:** tài liệu gộp, cập nhật và chuẩn hóa các script, cấu trúc file và quy ước lưu trữ cho các nguồn tuyển dụng Việt Nam. Bao gồm hướng dẫn đổi tên file, di chuyển file không liên quan, và xử lý encoding/unicode.

---

## 🎯 Mục tiêu hệ thống

* Crawl job listing public (danh sách + chi tiết)
* Lưu dữ liệu raw (Bronze) và dữ liệu chuẩn hoá (Silver)
* Giữ repo gọn: chỉ file/folder phục vụ crawl jobs trong `crawl_jobs/`.

---

## 📁 Cấu trúc thư mục đề xuất (repo)

```
/ (repo root)
├─ crawl_jobs/                # <- chỉ chứa crawl jobs và lib dùng chung
│  ├─ scripts/                # các script crawl: crawl_<site>.py
│  │  ├─ crawl_vieclam24h.py
│  │  ├─ crawl_vietnamworks.py
│  │  ├─ crawl_careerviet.py
│  │  ├─ crawl_topdev.py
│  │  └─ crawl_studentjob.py
│  ├─ lib/                    # các helper chung (fetcher, parser, storage)
│  │  ├─ fetcher.py
│  │  ├─ parser.py
│  │  └─ storage.py
│  └─ jobs_conf.yml           # config chung (rate limits, user agents)
├─ bronze/                    # RAW snapshots (html/json) — lưu giữ nguyên bytes
│  ├─ vieclam24h/YYYY-MM-DD/*.html
│  ├─ vietnamworks/YYYY-MM-DD/*.html
│  └─ ...
├─ silver/                    # normalized JSONL (NFC normalized, compressed)
│  ├─ vieclam24h/YYYY/MM/*.jsonl.gz
│  └─ ...
├─ unrelated/                 # tất cả file/folder không dùng cho crawl job (moved)
├─ .gitignore
└─ CRALWING_SOURCES.md        # tài liệu này
```

> Ghi chú: **Chỉ** giữ thư mục `crawl_jobs/`, `bronze/`, `silver/` và tài liệu liên quan trong root. Các file/folder khác (scripts thử nghiệm, notebooks, tài liệu cũ...) chuyển vào `unrelated/` và thêm vào `.gitignore`.

---

## 📌 Quy tắc đổi tên / di chuyển file

* Tất cả script crawl chính có tiền tố `crawl_` và đặt trong `crawl_jobs/scripts/`.
* Helpers chung đặt trong `crawl_jobs/lib/`.
* Dùng `git mv` để đổi tên, ví dụ:

```bash
git mv old_fetch_vl24.py crawl_jobs/scripts/crawl_vieclam24h.py
```

* Di chuyển file/folder không liên quan:

```bash
mkdir -p unrelated
git mv misc_notes/ unrelated/
git mv experiments/ unrelated/
```

* Cập nhật `.gitignore` (ví dụ dưới). Commit thay đổi ngay sau khi di chuyển.

---

## .gitignore mẫu

```
# unrelated files
/unrelated/
# local env
.env
*.local
# data folders (no raw data in repo)
/bronze/
/silver/
# caches
__pycache__/
*.pyc
# editor
.vscode/
.idea/
```

---

## 🔧 Scripts & ví dụ (mẫu)

### 1) `crawl_jobs/lib/fetcher.py` (mẫu)

```python
# fetcher.py
import requests
from time import sleep

def fetch_url(url, headers=None, timeout=10, retries=2, backoff=1.0):
    for i in range(retries+1):
        try:
            r = requests.get(url, headers=headers, timeout=timeout)
            r.raise_for_status()
            return r.content  # trả về bytes
        except Exception as e:
            if i == retries:
                raise
            sleep(backoff*(i+1))
```

### 2) `crawl_jobs/lib/storage.py` (mẫu lưu raw + normalized)

```python
# storage.py
import os
import json
import gzip
import unicodedata


def save_raw_html(site, date_str, job_id, html_bytes, root='bronze'):
    path = os.path.join(root, site, date_str)
    os.makedirs(path, exist_ok=True)
    filep = os.path.join(path, f"{job_id}.html")
    with open(filep, 'wb') as f:
        f.write(html_bytes)
    return filep


def normalize_text(s: str) -> str:
    # Chuẩn hoá Unicode: NFC để tránh các chữ bị phân mảnh
    return unicodedata.normalize('NFC', s)


def save_silver_jsonl(site, year_month, records, root='silver'):
    # records: list of dicts (đã normalize)
    path = os.path.join(root, site, year_month)
    os.makedirs(path, exist_ok=True)
    filep = os.path.join(path, 'normalized.jsonl.gz')
    with gzip.open(filep, 'at', encoding='utf-8') as f:
        for r in records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    return filep
```

### 3) `crawl_jobs/scripts/crawl_vietnamworks.py` (mẫu gọi lib)

```python
# crawl_vietnamworks.py
from crawl_jobs.lib.fetcher import fetch_url
from crawl_jobs.lib.storage import save_raw_html, normalize_text, save_silver_jsonl
from bs4 import BeautifulSoup
import datetime

SITE = 'vietnamworks'

def parse_job_detail(html_bytes):
    # giữ nguyên bytes ở bronze, decode khi parse
    try:
        text = html_bytes.decode('utf-8')
    except UnicodeDecodeError:
        # fallback: detect or latin1
        text = html_bytes.decode('latin-1')
    soup = BeautifulSoup(text, 'html.parser')
    # ví dụ: tìm title, company ... (site-specific)
    title = soup.select_one('h1')
    title = title.get_text(strip=True) if title else ''
    # normalize
    title = normalize_text(title)
    return {'title': title}


def main():
    url = 'https://www.vietnamworks.com/job-sample-url'
    html = fetch_url(url)
    today = datetime.date.today().isoformat()
    job_id = 'sample-123'
    save_raw_html(SITE, today, job_id, html)
    rec = parse_job_detail(html)
    save_silver_jsonl(SITE, today[:7], [rec])

if __name__ == '__main__':
    main()
```

> **Lưu ý:** các parser site-specific cần viết theo DOM thực tế của trang, ưu tiên dùng selector cố định (CSS/XPath). Nếu trang trả JSON trong `<script>`, parse JSON thay vì DOM.

---

## ✅ Quy ước lưu / encoding và xử lý Unicode

1. **Luôn lưu raw HTML** dưới dạng bytes (không decode) trong `bronze/<site>/<date>/<id>.html` để có thể phục hồi phân tích sau này.
2. Khi chuyển sang Silver:

   * Decode bytes sang `str` bằng `utf-8` (strict). Nếu ném `UnicodeDecodeError`, thử `chardet` để detect encoding hoặc fallback `latin-1` và lưu metadata encoding ban đầu.
   * Áp dụng `unicodedata.normalize('NFC', text)` cho mọi chuỗi người dùng (title, company, description).
   * Khi ghi JSON/JSONL: mở file với `encoding='utf-8'` và `ensure_ascii=False` để giữ kí tự Unicode nguyên vẹn.
3. **Metadata**: với mỗi record nên chứa trường `_raw_encoding` (nếu có), `_fetched_at`, `_source_url`, `_raw_path` để truy ngược.
4. **Ký tự đặc biệt & HTML Entities**: dùng `html.unescape()` sau khi decode nếu cần thiết.
5. **Vietnamworks**: một số trang có charset meta khác; workflow chung:

   * lưu bytes
   * detect/try utf-8
   * normalize NFC
   * lưu metadata encoding

---

## 🛡️ Robots / Quy tắc crawl & Throttling

* Tuân thủ `robots.txt` mỗi site. Lưu cache robots cho 24h.
* Rate limiting: cấu hình mặc định 1 req/second per domain, burst <= 5.
* Retry/backoff với jitter.
* Respect `Retry-After` header nếu có.

---

## 🧪 Kiểm tra & migration (checklist)

* [ ] Liệt kê file hiện có trong repo: `git ls-files`
* [ ] Đổi tên các file crawl theo quy ước `crawl_<site>.py` và chuyển vào `crawl_jobs/scripts/`.
* [ ] Di chuyển file/folder không liên quan vào `unrelated/` và thêm `.gitignore`.
* [ ] Kiểm tra tất cả scripts: đảm bảo dùng `storage.save_raw_html()` và `save_silver_jsonl()`.
* [ ] Thêm tests nhỏ: chạy một fetch sample cho mỗi site, lưu xuống `bronze/` và parse sang `silver/`.
* [ ] Tạo task CI (optional) để kiểm tra encoding/normalization mỗi commit.

---

## 🔁 Ví dụ bash để thực hiện chuyển đổi nhanh

```bash
# 1) Tạo cấu trúc
mkdir -p crawl_jobs/scripts crawl_jobs/lib unrelated
# 2) Move existing crawl-like files (ví dụ file tên không chuẩn)
git mv fetch_vl24.py crawl_jobs/scripts/crawl_vieclam24h.py || mv fetch_vl24.py crawl_jobs/scripts/
# 3) Move unrelated
git mv experiments/ unrelated/ || mv experiments/ unrelated/
# 4) Add .gitignore
cat > .gitignore <<'EOF'
/unrelated/
/bronze/
/silver/
__pycache__/
EOF

# 5) Quick check of encodings (example) for files in bronze/
python - <<'PY'
import chardet, sys
from pathlib import Path
p = Path('bronze')
for f in p.rglob('*.html'):
    b = f.read_bytes()
    res = chardet.detect(b)
    print(f, res)
PY
```

---

## 📎 Ghi chú cuối

* Tài liệu này là file duy nhất chứa: danh sách trang cần crawl, quy ước file/script, storage format, xử lý unicode và thao tác di chuyển file. Khi cần cập nhật site mới, mở PR cập nhật file `CRALWING_SOURCES.md`.
* Nếu bạn muốn, tôi có thể tạo PR mẫu (bash + git commands) để tự động thực hiện rename/move; hoặc tạo script migration tự động. Nói rõ nếu cần.

---

*Tài liệu cập nhật — nếu cần thêm template parser cho một site cụ thể (ví dụ: selector cho vietnamworks hoặc topdev), gửi URL ví dụ của một trang job và mình sẽ bổ sung selector và code parsing cụ thể.*

---

## 📡 Kafka sử dụng trong pipeline

- **Kafka cluster**: Confluent Platform **7.3.2** (image Docker `confluentinc/cp-kafka:7.3.2`), tương ứng Apache Kafka 3.x ổn định.
- **Định hướng client Node.js**: khi gắn producer/consumer cho các crawler trong `crawl_jobs/`, khuyến nghị dùng thư viện **`kafkajs`** (phiên bản 2.x ổn định) để publish bản ghi Silver vào topic (ví dụ: `jobs_vn_silver`).

<!-- APPEND_MARKER -->