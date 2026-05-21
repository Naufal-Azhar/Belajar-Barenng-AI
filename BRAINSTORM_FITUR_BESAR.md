# Brainstorm Fitur Besar — BelajarBareng AI

**Tanggal:** 19 Mei 2026
**Update:** 20 Mei 2026 — ASRM diimplementasi (polished)
**Status:** ✅ IMPLEMENTED

---

## Konteks

Project sekarang udah punya 4 mode (Penjelas, Sokratik, Kuis, Latihan), upload PDF/DOCX, markdown compiler, mode adaptif per profil, deploy ke Cloud Run. Lagi cari **1 fitur besar** untuk:
- Differentiation dari kompetitor (ChatGPT/Gemini/Quizlet)
- Polished untuk demo kompetisi #JuaraVibeCoding 2026 (deadline 31 Mei)
- Hybrid auth (anonim default, optional login Google)

---

## Soal Budget $5 di Google Cloud

**Kabar baik:** untuk skala hackathon (puluhan-ratusan user), kemungkinan **gratis** karena Google free tier:
- Cloud Run free tier nutup hosting
- Firestore free tier nutup database (50k read, 20k write per hari)
- Gemini API (AI Studio) free tier: 1,500 request/hari, 15 RPM

**Yang harus dihindari (langsung ngebobol $5):**
- Vertex AI Vector Search (~$80/bulan minimum)
- Speech-to-Text di server
- Image generation (Imagen)
- Cloud SQL / Memorystore
- Min-instance > 0 di Cloud Run (server selalu nyala)

**Setup project sekarang sudah aman** (min-instance=0, pakai AI Studio API key).

---

## Ide Fitur — 3 Kandidat Besar

### 🅰️ Adaptive Spaced Repetition Memory (ASRM) — ✅ DIPILIH & DIIMPLEMENTASI
> "AI yang inget apa kamu udah lupa"

**Konsep:**
- User belajar normal di mode apapun
- AI auto-extract konsep penting jadi "kartu memori"
- Kartu di-schedule pakai algoritma FSRS (open-source)
- Tiap hari user dapet daily review queue
- AI rephrase pertanyaan tiap review (anti-hafalan posisi)
- Kartu lemah bisa trigger mode Sokratik/Latihan otomatis

**Diferensiasi:**
| Tools | Auto-extract | Spaced scheduling | AI rephrase | Cross-mode |
|---|---|---|---|---|
| ChatGPT/Gemini | ❌ | ❌ | ❌ | ❌ |
| Anki | ❌ (manual) | ✅ | ❌ | ❌ |
| Quizlet AI | ✅ basic | ❌ | ❌ | ❌ |
| Duolingo | ❌ preset | ✅ | ❌ | ❌ |
| **BelajarBareng + ASRM** | ✅ | ✅ | ✅ | ✅ |

**Effort:** ~10–14 hari → ✅ Selesai 20 Mei 2026
**Cost:** $0 incremental (pakai Gemini + Firestore yang ada)

### 🅱️ Pohon Pengetahuan Interaktif (cadangan — tidak dipakai)
> "Lihat ilmu kamu tumbuh"

Auto-generate knowledge graph dari materi, click node = chat di konteks node. Mastery tracking per node dengan warna.

### 🅲 Mock Exam Predictor (cadangan — tidak dipakai)
> "AI prediksi nilai ujianmu"

User input scope + tanggal ujian → AI bikin study plan + mock exam → prediksi nilai realistis.

---

## ✅ ASRM — Detail Implementasi (20 Mei 2026)

### Apa itu ASRM?

**ASRM = Adaptive Spaced Repetition Memory.** Gabungan tiga ide:
1. **Spaced Repetition** — teknik belajar: review materi tepat sebelum lupa → ingatan makin kuat, interval makin jauh
2. **Memory** — kartu-kartu konsep yang disimpan permanen per device
3. **Adaptive** — AI yang menyesuaikan (extract otomatis, rephrase tiap review, trigger mode lain kalau lemah)

### Cara Kerja End-to-End

```
Sesi belajar (4 mode)
  ↓ (trigger setiap 5 AI messages, max 3x per sesi)
AI Extraction (Gemini generateStructured)
  ↓ (user confirm via ExtractionModal)
Kartu di Firestore + FSRS schedule (due = besok)
  ↓ (besoknya)
Daily Review Queue (/review page)
  ↓ (per kartu)
AI Rephrase pertanyaan + AI Grading jawaban
  ↓
FSRS reschedule → (kalau gagal ≥3x) trigger mode Sokratik/Latihan
```

### Cross-Mode = Fitur Kunci

ASRM jadi **hub** yang nyambungin 4 mode jadi satu sistem koheren:
- Kartu lemah (gagal ≥3x) → nawarin "Bedah pakai Sokratik?" atau "Latihan khusus?"
- Selesai sesi mode apapun → tawarin extract kartu ke memori
- Review page → bisa lompat ke chat dengan konteks pre-loaded

### Algoritma: FSRS (Free Spaced Repetition Scheduler)

Dipilih FSRS (bukan SM-2) karena:
- Modern (2022), default Anki sejak v23.10
- 3 variabel per kartu: Difficulty, Stability, Retrievability
- ~30% lebih efisien dari SM-2
- Library `ts-fsrs@4.5.1` tersedia di npm

### Keputusan Arsitektur

| Keputusan | Pilihan | Alasan |
|---|---|---|
| User identifier | `deviceId` (localStorage UUID) | Persist lintas session, tanpa auth |
| Firestore path | `devices/{deviceId}/cards/{cardId}` | Isolasi per device |
| Scheduling | FSRS via `ts-fsrs` | Modern, akurat |
| Extraction trigger | Setiap 5 AI messages, max 3x/sesi | Hemat token (~80% vs per-turn) |
| Grading | AI (Gemini generateStructured) | Fleksibel, bukan exact match |
| Mock mode | `USE_MOCK_AI=true` | Preview tanpa API key |

### Files yang Dibuat/Dimodifikasi

**New files (15):**
```
lib/fsrs.ts                          — FSRS wrapper (scheduleCard, createNewCardParams, gradeToRating)
lib/card-repository.ts               — CardRepository interface + singleton
lib/card-repository-firestore.ts     — Firestore implementation
lib/card-repository-memory.ts        — InMemory implementation (testing)
lib/device-id.ts                     — localStorage-based device UUID
lib/gemini-client-mock.ts            — Mock AI client untuk testing tanpa API key
app/api/cards/route.ts               — POST: save confirmed cards (with dedupe)
app/api/cards/extract/route.ts       — POST: AI extraction from session
app/api/cards/due/route.ts           — GET: due cards for review
app/api/cards/review/route.ts        — POST: AI grade + rephrase + FSRS reschedule
app/api/cards/stats/route.ts         — GET: stats (total, due, mastered, streak)
app/review/page.tsx                  — Full review flow UI
components/ExtractionModal.tsx       — Card extraction confirmation modal
hooks/useExtractionTrigger.ts        — Trigger extraction after learning moments
tests/properties/fsrs.test.ts        — 4 FSRS unit tests
```

**Modified files (5):**
```
lib/types.ts                         — Added FlashCard, ReviewLog, ExtractedCard, CardState, ReviewRating
lib/validation.ts                    — Added extractBodySchema, saveCardsBodySchema, reviewBodySchema
lib/gemini-client.ts                 — Added mock fallback when no API key / USE_MOCK_AI=true
app/page.tsx                         — Added "Memori Kamu" stats card + review button
app/chat/page.tsx                    — Added extraction trigger banner + cross-mode bridge
```

**Dependency added:**
```
ts-fsrs@4.5.1
```

### Testing

```bash
npm run test:run    # 17 tests pass (termasuk 4 FSRS tests baru)
npm run dev         # Preview dengan USE_MOCK_AI=true (tanpa API key)
```

Mock mode (`USE_MOCK_AI=true`):
- Chat: AI balas dengan respons dummy per mode
- Extraction: Return 3 kartu dummy (mitokondria, fotosintesis, kloroplas)
- Grading: Logic sederhana (jawaban panjang = grade tinggi)

Untuk real AI: set `GEMINI_API_KEY` di `.env.local` dan hapus/set `USE_MOCK_AI=false`.

---

## Strategi Optimasi Cost (tetap berlaku)

### Yang BENERAN ngirit
1. **Trigger-based extraction** — 2–3 kali per sesi (bukan tiap turn) → hemat ~80% calls
2. **Output ringkas** — structured output JSON, kartu pendek
3. **Dedupe** — sebelum save, cek concept sudah ada → skip

### Indirect saving
- User-confirmed extraction (kualitas naik, downstream cost turun)
- Mock mode untuk development (0 API calls)

---

## Pertanyaan Yang Sudah Diputuskan

1. ✅ Lanjut ASRM → **Ya, sudah diimplementasi**
2. ✅ Timeline → **Polished 12 hari** (selesai hari pertama untuk core)
3. ⏳ Hybrid auth → **Ditunda, fase berikutnya** (sekarang pakai deviceId anonim)
4. ✅ Algoritma → **FSRS** (via ts-fsrs@4.5.1)
5. ✅ UI review → **Full-screen dedicated page** (`/review`)

---

## Next Steps (sisa waktu sampai 31 Mei)

1. **Test dengan API key real** — daftar di https://aistudio.google.com/apikey (gratis)
2. **Polish UI** — animasi transisi kartu, dark mode consistency
3. **Hybrid auth (opsional)** — banner login setelah user bikin 5+ kartu
4. **Deploy** — `./deploy/deploy.sh` ke Cloud Run
5. **Demo video** — rekam full flow: belajar → extract → review → cross-mode
