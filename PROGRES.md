# PROGRES — BelajarBareng AI

---

## ✅ Yang Sudah Dikerjain 

## 17/5/2026 (minggu)

### 1. Pindahin semua konten Onboarding ke kiri
- Sebelumnya layout onboarding itu tengah semua
- Sekarang headline, tagline, dan form pilih profil (Pelajar SMA / Mahasiswa) semuanya rata kiri
- Sisi kanan dibiarkan kosong dulu, nanti bisa diisi

### 2. Pasang GIF sebagai background Onboarding
- User download GIF daun dari folder `GIF/`
- GIF itu kita copy ke folder `public/` supaya bisa diakses browser
- GIF dipasang sebagai background halaman onboarding dengan opacity rendah biar gak ganggu teks

### 3. Ganti emoji 🤔 di Mode Sokratik pakai GIF
- Di halaman Mode Sokratik ada emoji thinking face 🤔
- Diganti pakai file `writing.gif` (GIF animasi buku + pensil)
- Ukuran GIF dibiarkan original, tidak diperbesar

### 4. GIF tidak bisa di-drag
- Secara default, gambar di browser bisa di-drag (klik tahan lalu geser)
- Kita matiin itu dengan `draggable={false}` dan `pointerEvents: none`
- Sekarang GIF tidak bisa di-drag, diklik-kanan, atau diselect

### 5. Bikin file PROGRES.md ini
- Dokumentasi apa yang sudah dikerjain biar gampang dilacak

---

## update 18/5/2026 (senin)

> *Pacth update untuk fitur lanjutan*

---

## 1. penambahan fix border dan layout untuk android dan laptop. 
- Penambahan fix border dan layout untuk android ( HP atau TABLET ) 
- Penambahan fix border dan layout untuk laptop

## 2. perubahan dark mode dan light mode untuk website. 
- Secara default fitu dark mode dan light mode tidak ada lalu di tambahkan fitur dark mode dan light mode untuk website tetapi kurang baik di halaman onboarding tidak ada dark mode dan light mode

## 3. update file gif
- Mengupdate file GIF untuk memperbaiki tampilan dan animasi menjadi lebih tajam dan halus, lalu di replace dari gif ke file format webm

- menambahkan animasi loading pada setiap substract

## update 19/5/2026 (selasa)

> *Masih Brainstorming untuk penentuan apa lagi yang akan di ambil*

---

## 1. Brainstorming 
- Perencanaan untuk fitur utama yang akan di implementasikan ke dalam project.
- Penyusuaian untuk me reduce cost dari AI GEMINI yang akan digunakan, agar bisa lebih efisien dan dapat digunakan untuk kebutuhan demonstrasi dengan relatif user dia antara 10 - 200 user.
- Penekanan Budget untuk memenuhi infrastruktur yang diperlukan, budge4t yang di keluarkan berada di harga 5$.

## update 21/5/2026 (kamis)

> *Tambahan fitur *

---

## 1. Penambahan fitur ASRM 
- Penambahan fitur ASRM (Active Stress Reduction Method) untuk mengurangi stress dan meningkatkan kualitas belajar agar user tidak merasa bosan dan stress.

## 2. Improve fitur 
- Improve fitur untuk dark mode, warm tone dan shadow clean-up agar si user betah memakai aplikasi nya.

## 3. Mencoba AI
- Dalam tahap pencobaan atau uji coba AI agar bisa berjalan dan menerima input dari user.

## update 22/5/2026 (jumat)

> *Migrasi ke Google Gemini API*

--- 
## 1. Migrasi ke Google Gemini API

- Full migrate ke Google Gemini API (`@google/generative-ai` SDK, model `gemini-2.0-flash`)
- Hapus dependency `openai`, ganti dengan `@google/generative-ai@0.21.0`
- Tambah `@google-cloud/storage@7.14.0` untuk persist file upload ke GCS
- Buat `deploy/setup-gcp.sh` untuk one-time GCP project setup
- Update `deploy/deploy.sh` untuk Cloud Run deploy dengan service account auth
- Semua API routes tetap pakai abstraksi `getLLMClient()` — zero breaking change
- 17 tests pass, TypeScript compiles clean