# BelajarBareng AI 📚

> *"Nggak ada lagi alasan nggak ngerti. Tanya aja."*

Teman belajar personal berbasis AI untuk mahasiswa dan pelajar SMA Indonesia. Upload materi (PDF atau DOCX) atau ketik topik, lalu AI akan menjelaskan, membuat analogi, mengadakan kuis, dan menemani latihan soal — masing-masing dengan layout yang dirancang khusus per mode.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- [Google Gemini API Key](https://aistudio.google.com/apikey) — atau Google Cloud Service Account
- Google Cloud Project dengan Firestore enabled (atau jalankan dengan in-memory store)

### Setup

```bash
# Clone & install
npm install

# Copy env
cp .env.example .env.local
# Edit .env.local dengan API key kamu

# Run development
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Deskripsi | Default |
|---|---|---|
| `GEMINI_API_KEY` | API key dari Google AI Studio | (required) |
| `GEMINI_MODEL` | Model Gemini yang digunakan | `gemini-2.0-flash` |
| `GOOGLE_CLOUD_PROJECT` | Google Cloud Project ID | `local-dev` |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path ke service account key JSON | - |
| `GCS_BUCKET` | Cloud Storage bucket untuk file upload | - |
| `USE_MEMORY_STORE` | `true` untuk pakai in-memory repo (no Firestore) | `false` |
| `USE_MOCK_AI` | `true` untuk preview tanpa API key | `false` |
| `PORT` | Port server | `3000` |

## 🧪 Testing

```bash
npm run test:run    # Run all property tests
npm test           # Watch mode
```

Saat ini ada 4 property test menggunakan `fast-check`:
- **Property 5** — Upload validation rejects invalid input (PDF + DOCX MIME, 10 MB cap)
- **Property 17** — LayoutRouter routes valid modes + falls back to Penjelas for invalid
- **Property 19** — Token-saving invariant: prompt tidak pernah mengandung byte mentah (`%PDF-`, `PK\x03\x04`, base64 long-run)
- **Property 20** — Quiz state machine transitions match the closed transition table

## 🐳 Docker

```bash
docker build -t belajar-bareng-ai .
docker run -p 8080:8080 \
  -e GEMINI_API_KEY=your-key \
  -e USE_MEMORY_STORE=true \
  belajar-bareng-ai
```

## ☁️ Deploy ke Cloud Run

```bash
# One-time setup (buat project, enable APIs, service account, Firestore, GCS)
chmod +x deploy/setup-gcp.sh
./deploy/setup-gcp.sh <PROJECT_ID> <BILLING_ACCOUNT_ID>

# Deploy
chmod +x deploy/deploy.sh
./deploy/deploy.sh <PROJECT_ID>
```

## 🏗️ Tech Stack

- **Next.js 14** (App Router) — Full-stack framework
- **Tailwind CSS** + **Framer Motion** — UI & animasi
- **Google Gemini 2.0 Flash** — AI engine via `@google/generative-ai` SDK
- **pdf-parse** — PDF text extraction server-side (no AI token)
- **mammoth ^1.7** — Konversi DOCX → Markdown server-side (no AI token)
- **Firestore** — Session persistence
- **Cloud Storage** — File upload persistence
- **Cloud Run** — Deployment
- **fast-check** — Property-based testing

## 📁 Struktur Project

```
app/
  ├── api/                  → Health, session, upload, chat (SSE), summary, cards
  ├── chat/                 → Chat page (header + LayoutRouter)
  ├── review/               → Flashcard review page
  └── summary/              → Session summary
components/
  ├── layouts/              → LayoutRouter + 4 layout per-mode
  │   ├── LayoutRouter.tsx
  │   ├── PenjelasLayout.tsx
  │   ├── SokratikLayout.tsx
  │   ├── KuisLayout.tsx
  │   └── LatihanLayout.tsx
  ├── DocumentUploader.tsx  → PDF + DOCX uploader
  ├── AIStatusBox.tsx       → Kotak persegi sticky (Kuis)
  ├── QuizWizard.tsx        → Setup wizard 3 langkah
  └── ...
lib/
  ├── llm-client.ts         → LLMClient interface + GeminiClient + factory
  ├── llm-client-mock.ts    → Mock client untuk dev tanpa API key
  ├── llm-config.ts         → Centralized LLM config (env reader)
  ├── storage.ts            → Cloud Storage upload helper
  ├── intent.ts             → Non-academic message detection
  ├── markdown-compiler.ts  → PDF (pdf-parse) | DOCX (mammoth) → Markdown
  ├── quiz-state-machine.ts → Pure reducer (idle→...→completed)
  ├── prompt-builder.ts     → System prompt builder per mode
  └── ...
hooks/                      → useSession, useChatStream
tests/                      → Property tests (fast-check)
deploy/
  ├── setup-gcp.sh          → One-time GCP project setup
  └── deploy.sh             → Cloud Run deploy script
```

## 🎓 Fitur

1. **Dual Input** — Upload **PDF atau DOCX** atau ketik topik bebas
2. **4 Layout Belajar Berbeda** — Penjelas (chat), Sokratik (rail kanan), Kuis (split + AI status box), Latihan (attempt-first + steps)
3. **General Mode** — Pesan non-akademik (sapaan, tanya tentang AI) dijawab natural tanpa structured output
4. **Layout Router** — Tiap mode punya layout sendiri; switch mode tidak menghapus history
5. **Markdown Compiler** — File di-compile ke Markdown sebelum prompt (hemat token)
6. **Quiz Wizard** — State machine eksplisit: upload → tipe → jumlah → run
7. **Streaming AI** — Respons real-time via SSE
8. **Flashcard + FSRS** — Spaced repetition dengan AI grading
9. **Session Summary** — Ringkasan akhir sesi belajar
10. **Cloud Storage** — File upload di-persist ke GCS
11. **Tanpa Registrasi** — Langsung pakai, zero friction

---

*Dibuat untuk kompetisi #JuaraVibeCoding Google 2026*
