FROM python:3.10-slim

# Menyiapkan folder penyimpanan aplikasi dalam Container
WORKDIR /app

# Menginstal dependensi sistem operasi
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Menyalin file konfigurasi library pip
COPY requirements.txt .

# Menghentikan pesan update pip dan menginstal seluruh package YOLO
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .
EXPOSE 5000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000"]
