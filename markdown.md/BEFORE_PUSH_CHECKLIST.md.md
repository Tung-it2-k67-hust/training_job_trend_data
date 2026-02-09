Ok, mình viết cho bạn **1 file Markdown** để bỏ vào repo (ví dụ `SECURITY_GUIDE.md` hoặc `BEFORE_PUSH_CHECKLIST.md`). Nội dung này mô tả:

* Ẩn API key
* dùng `.gitignore`
* pre-check secret trước khi push
* checklist trước khi upload code lên GitHub

Bạn chỉ cần tạo file `.md` rồi paste nội dung dưới 👇

---

## 📄 Nội dung file `BEFORE_PUSH_CHECKLIST.md`

```md
# 🔐 Security & Secret Checklist Before Pushing Code

Repo: https://github.com/Tung-it2-k67-hust/training_job_trend_data

---

## 1. Never Commit Secrets

❌ Không được commit:

- API Keys
- Access Tokens
- Passwords
- Database credentials
- AWS / GCP / Azure keys
- Private URLs chứa token
- OAuth secrets
- .env files
- SSH private keys

Ví dụ nguy hiểm:

```

API_KEY=123456
mongodb://user:password@host
[https://api.xxx.com?token=abc](https://api.xxx.com?token=abc)

```

---

## 2. Use Environment Variables

Tạo file:

```

.env

```

Ví dụ:

```

API_KEY=your_key
DB_PASSWORD=your_password

````

Trong code:

```python
import os
API_KEY = os.getenv("API_KEY")
````

---

## 3. Add Sensitive Files to `.gitignore`

File `.gitignore` nên có:

```
.env
.env.*
config/secrets.yaml
*.pem
*.key
*.json
credentials/
secrets/
minio-data/
__pycache__/
node_modules/
```

---

## 4. Scan For Secrets Before Push

### Cách 1 — Search nhanh

```
git diff
```

Tìm:

* api
* key
* token
* password
* secret

---

### Cách 2 — grep local

```
grep -Ri "api_key" .
grep -Ri "password" .
grep -Ri "token" .
grep -Ri "secret" .
```

---

### Cách 3 — dùng tool (khuyến nghị)

#### gitleaks

```
gitleaks detect
```

#### trufflehog

```
trufflehog filesystem .
```

---

## 5. Nếu lỡ commit secret

⚠️ Làm ngay:

1. Rotate key
2. Revoke token
3. Remove khỏi git history

```
git filter-repo
```

Hoặc:

```
bfg repo-cleaner
```

---

## 6. Final Checklist Before Push

* [ ] Không có API key hardcode
* [ ] Không có password trong config
* [ ] `.env` đã ignore
* [ ] Data nhạy cảm đã remove
* [ ] Test file log không chứa token
* [ ] Run secret scan
* [ ] Check git diff lần cuối

---

## 7. Push Code

```
git add .
git commit -m "initial training_job_trend_data codebase"
git push origin main
```

---

## 8. Recommended Repo Structure

```
training_job_trend_data/
│
├── data/
├── src/
├── scripts/
├── config/
│   └── example.env
├── .gitignore
├── README.md
└── BEFORE_PUSH_CHECKLIST.md
```

---

## 9. Best Practice

* Commit `example.env` thay vì `.env`
* Dùng secret manager khi deploy
* Không hardcode credential trong notebook
* Không upload raw credential JSON

```

---

## 🧠 Mình khuyên bạn làm thêm mấy cái này (rất đáng luôn)

### 1️⃣ Thêm `.env.example`
Chỉ chứa tên biến, không chứa secret

```

API_KEY=
DB_HOST=
DB_USER=
DB_PASS=

```

### 2️⃣ Setup gitleaks auto trước commit
```

pre-commit install

```

---

## 🚀 Nếu bạn muốn mình làm luôn cho bạn (khuyên cực mạnh)

Mình có thể viết luôn:

- `.gitignore` chuẩn data engineering + big data + ML + crawler
- repo structure chuẩn Kafka + Spark + Data Pipeline
- security checklist cho MinIO + Google Drive mount
- template README cho project job trend prediction
- script auto secret scan trước khi push

Bạn chỉ cần nói:

👉 **"generate full secure repo template cho training_job_trend_data"**

là mình build nguyên bộ chuẩn production cho bạn 👍
```
