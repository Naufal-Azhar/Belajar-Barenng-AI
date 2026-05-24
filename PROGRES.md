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


## update 23/5/2026 (sabtu)

> *Major upgrade: Multi-Conversation Architecture (gaya Claude/NotebookLM)*

---

### Konteks
Sebelumnya app ini hanya support 1 sesi aktif per browser (single-slot localStorage). Setelah "Akhiri Sesi", session ID tidak dibersihkan, jadi user yang balik ke `/` selalu redirect ke chat lama yang udah selesai. Tidak ada UI untuk lihat list sesi atau bikin sesi baru tanpa "menggantikan" sesi aktif. Ini bottleneck UX besar untuk demo publik.

### Yang Dikerjain (12 dari 14 task — 86%)

#### Phase 1: Backend Foundation
- **Task 1**: Extend Session schema (tambah `ownerType`, `ownerId`, `title`, `isArchived`, `updatedAt`). Repository methods baru: `listByOwner`, `updateTitle`, `archive`, `touch`, `migrateOwner`. Backward-compat: sesi lama tanpa `ownerId` di-treat sebagai `ownerType:'device', ownerId:'legacy'` (orphan-safe).
- **Task 2**: API `GET /api/sessions` (list) dengan ownership filter
- **Task 3**: API `POST /api/sessions` (create) dengan owner injection via `X-Device-Id` header
- **Task 4**: API `GET/PATCH/DELETE /api/sessions/:id` — load detail, rename, soft archive

#### Phase 2: Auto-title + Frontend State
- **Task 5**: Auto-title dari first user message (40 char, dengan fallback "Sesi {tanggal}")
- **Task 6**: Refactor `useSession` baca query param `?sessionId=`, bikin hook baru `useSessions` (list + CRUD dengan optimistic update)

#### Phase 3: Sidebar UI
- **Task 7**: Komponen `Sidebar.tsx` — date grouping (Hari ini / Kemarin / 7 hari lalu / Bulan ini / Lebih lama), inline rename, delete confirmation modal, mobile drawer, login slot prop
- **Task 8**: Wire sidebar ke `/chat` page jadi 2-pane layout
- **Task 9**: Inline rename + delete + redirect kalau session aktif dihapus

#### Phase 4: Dashboard + Routing
- **Task 10**: Dashboard di `/` (replace auto-redirect bug). Grid card per sesi dengan profile badge, mode label, relative time
- **Task 11**: "Akhiri Sesi" tidak menghapus sesi dari sidebar — hanya di-mark ended, banner "Sesi sudah selesai" muncul saat dibuka, input chat di-disable
- **Task 12**: Cleanup legacy `/api/session` endpoint + key `belajar.sessionId` (auto-migrate ke `belajar.activeSessionId` pada first read)

#### Phase 6: Polish
- **Task 17**: Empty states + loading states + error boundaries. Skeleton loader di sidebar, illustration leaf-bg.gif di empty dashboard, error toast di Dashboard, `<ErrorBoundary>` wrapper di root layout
- **Task 18**: Documentation (README + .env.example + PROGRES + deploy checklist)

### Yang Di-skip (Phase 5: Firebase Auth)
- **Task 13-16** ditunda jadi post-hackathon. Phase 5 akan tambah login Google + sync sesi antar device, tapi butuh setup Firebase Console + service account JSON yang bisa dilakukan kapan saja nanti. Untuk publish hackathon yang dinilai async, mode anonim (deviceId) udah cukup.

### Hasil
- 80/80 property tests pass (29 → 80, 51 test baru ditambah)
- TypeScript strict mode clean
- Backend free tier safe: <100 reads/day per visitor untuk skala demo
- URL pattern shareable: `/chat?sessionId=xxx`
- Mobile-friendly (sidebar drawer)
- Schema migration backward-compat — sesi lama tidak crash app

### Modified Files (28 file)
Lihat git log untuk daftar lengkap. Highlight: `lib/types.ts`, `lib/session-repository.ts`, `app/api/sessions/`, `components/Sidebar.tsx`, `components/Dashboard.tsx`, `hooks/useSessions.ts`.
