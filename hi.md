Ok 👍 tôi viết lại cho bạn **một phiên bản mô tả đã chỉnh sửa hợp lý hơn**, trong đó:

* ✅ **Unique Key = `source + job_id_trích_từ_link`**
* ❌ không dùng job_id riêng lẻ nữa
* 🧠 nhấn mạnh parse ID từ URL
* 🔧 chỉnh lại flow + data model cho đúng production

Bạn có thể copy nguyên khối này thay vào markdown cũ luôn.

---

# 🕷️ Production Incremental Job Crawler – Early Stop Strategy (Revised)

Tài liệu này mô tả kiến trúc cho hệ thống Job Crawler hoạt động theo cơ chế:

* **Incremental Crawling** – chỉ lấy job mới
* **Early Stop by Duplicate** – dừng khi gặp dữ liệu đã crawl trước đó
* **Composite Unique Key** – định danh job bằng `source + job_id_from_url`

---

## 1. Định Danh Dữ Liệu (Identity Strategy)

### 🎯 Mục tiêu

Đảm bảo mỗi job là duy nhất ngay cả khi:

* nhiều nguồn khác nhau
* ID trùng giữa các website
* repost hoặc reindex

---

### 🔑 Unique Key Chuẩn (Revised)

```
unique_key = source + "_" + job_id_from_url
```

Ví dụ:

| Source | Job URL            | Parsed ID | Unique Key   |
| ------ | ------------------ | --------- | ------------ |
| topdev | /jobs/12345        | 12345     | topdev_12345 |
| itviec | /job/backend-12345 | 12345     | itviec_12345 |

---

### 🧠 Lưu ý quan trọng

* **job_id phải được parse từ URL**
* không dùng title
* không dùng timestamp
* không dùng internal ID do crawler tạo

---

## 2. Chiến Lược Crawling – Early Stop by Duplicate

Crawler sẽ:

1. Crawl từ trang mới nhất (Page 1)
2. Duyệt pagination
3. Kiểm tra `unique_key`
4. Dừng khi gặp **N duplicate liên tiếp**

---

### 🛡️ Vì sao cần N duplicate liên tiếp?

Job site thường:

* ghim bài
* quảng cáo
* repost job
* reorder listing

=> gặp 1 duplicate chưa chắc hết job mới.

---

### ⚙️ Config đề xuất

```
DUP_LIMIT = 30
```

---

## 3. Flow Crawling (Revised)

### 🔄 Process Flow

```
Load existing unique_keys vào RAM

for page in pagination:

    fetch page
    parse jobs

    for job:
        extract job_id_from_url
        unique_key = source + "_" + job_id

        nếu unique_key tồn tại:
            tăng duplicate_count
        else:
            reset duplicate_count
            lưu dữ liệu

        nếu duplicate_count >= DUP_LIMIT:
            stop crawl
```

---

## 4. Pseudo Code (Updated Identity Model)

```python
existing_keys = load_existing_keys()
duplicate_count = 0
DUP_LIMIT = 30
page = 1

while True:
    jobs = crawl_page(page)

    if not jobs:
        break

    for job in jobs:
        job_id = extract_id_from_url(job.url)
        unique_key = f"{job.source}_{job_id}"

        if unique_key in existing_keys:
            duplicate_count += 1
        else:
            duplicate_count = 0
            save_raw(job)
            upsert_clean(job, unique_key)
            existing_keys.add(unique_key)

        if duplicate_count >= DUP_LIMIT:
            print("Reached old data. Stop crawling.")
            exit()

    page += 1
```

---

## 5. Kiến Trúc Data Lake

### 🥉 Bronze Layer

* lưu raw JSON
* lưu tất cả kể cả duplicate
* dùng cho audit/debug

---

### 🥈 Silver Layer

* upsert theo `unique_key`
* detect update bằng content hash
* dùng cho analytics & downstream pipeline

---

## 6. Module Structure

```
fetcher.py       → HTTP request + retry + delay
parser.py        → parse HTML/JSON + extract job_id_from_url
identity.py      → generate unique_key (source + job_id)
storage.py       → save bronze + silver
main.py          → orchestration + early stop logic
```

---

## 7. Best Practices (Updated)

| Sai lầm ❌                | Làm đúng ✅                    |
| ------------------------ | ----------------------------- |
| dùng job_id đơn lẻ       | dùng source + job_id_from_url |
| dừng khi gặp 1 duplicate | dùng DUP_LIMIT                |
| check theo ngày đăng     | check theo unique_key         |
| query DB mỗi job         | preload key vào RAM           |
| request interval cố định | dùng random delay             |

---

## 8. Delay & Anti-Block Strategy

```
sleep random(25–45s)
```

* không dùng delay cố định
* không crawl quá sâu pagination
* không chạy nhiều source song song cùng IP

---

## 9. Demo & Local Test Strategy

Lưu song song:

```
data/demo/run_YYYYMMDD.json
```

và:

```
MinIO Bronze (parquet)
```

Flow:

```
crawl → raw json → demo folder
      → convert parquet → upload MinIO
```

---

# 👍 Nhận xét thật lòng

Phiên bản bạn đang viết **đã rất gần production rồi**, chỉnh lại identity model theo:

```
source + job_id_from_url
```

là chuẩn luôn cho hệ crawler multi-source.

