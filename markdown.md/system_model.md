[Job Websites / APIs / Scraper Bots]
                │
                ▼
         (Kafka Producer)
                │
                ▼
            Apache Kafka
      (stream job postings realtime)
                │
                ▼
       Apache Spark Streaming
   - cleaning
   - NLP skill extraction
   - salary normalization
   - deduplicate
                │
     ┌──────────┴──────────┐
     ▼                     ▼
Data Lake              Feature Store
(S3/HDFS/MinIO)        (Parquet/Delta)
     │                     │
     ▼                     ▼
 Batch ML              Real-time ML
 (trend forecast)      (salary predict)
     │
     ▼
 Dashboard (Superset/PowerBI/Streamlit)
