# 🇻🇳 Job Crawling Sources (Vietnam)

Tài liệu này mô tả các website tuyển dụng tại Việt Nam được sử dụng làm nguồn dữ liệu crawl cho hệ thống thu thập job postings.

## 🎯 Mục tiêu
- Thu thập job listing public
- Thu thập job detail (title, company, salary, location, description)
- Lưu dữ liệu raw vào Bronze layer
- Chuẩn hóa dữ liệu tại Silver layer

## ⚠️ Nguyên tắc crawl chung
- Chỉ crawl nội dung public
- Tuân thủ robots.txt của từng website
- Không crawl:
  - login
  - apply job
  - ajax/api nội bộ
  - account/profile pages
- Ưu tiên crawl từ sitemap.xml
- Áp dụng rate limiting

---

# 📊 Danh sách Website Crawl

---

## 🟢 1. Vieclam24h
**URL:** https://vieclam24h.vn

### Robots Policy
Cho phép crawl phần lớn nội dung public.

### Không được crawl
- `/admin/`
- `/taikhoan/`
- `?q` (search query)

### Có thể crawl
- job listing
- job detail
- category pages

### Đặc điểm kỹ thuật
- HTML truyền thống
- dễ parse
- ít anti-bot

### Độ khó crawl
⭐ Dễ

---

## 🟢 2. CareerViet (CareerBuilder Vietnam)
**URL:** https://careerviet.vn

### Robots Policy
Cấm các action nội bộ và ajax endpoint.

### Không được crawl
- save job
- ajax
- apply actions
- resume search
- matching endpoints

### Có thể crawl
- job listing
- job detail

### Đặc điểm kỹ thuật
- structured HTML
- có JSON data embed

### Độ khó crawl
⭐⭐ Trung bình

---

## 🟢 3. TopDev
**URL:** https://topdev.vn

### Robots Policy
Cho phép crawl toàn site public.

### Không được crawl
- login
- employer search
- socket.io
- apply endpoint

### Có thể crawl
- tech job listings
- job detail pages

### Đặc điểm kỹ thuật
- Next.js frontend
- JSON data trong script

### Độ khó crawl
⭐⭐ Trung bình

---

## 🟢 4. StudentJob
**URL:** https://studentjob.vn

### Robots Policy
Cho phép crawl toàn bộ nội dung public.

### Có thể crawl
- job listing
- internship jobs
- fresher jobs
- job detail

### Đặc điểm kỹ thuật
- HTML đơn giản
- crawl-friendly

### Độ khó crawl
⭐ Rất dễ

---

# 🧱 Kiến trúc Crawl đề xuất

