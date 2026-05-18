# BelajarBareng AI 📚

> *"Nggak ada lagi alasan nggak ngerti. Tanya aja."*

Teman belajar personal berbasis AI untuk mahasiswa dan pelajar SMA Indonesia. Upload materi (PDF atau DOCX) atau ketik topik, lalu AI akan menjelaskan, membuat analogi, mengadakan kuis, dan menemani latihan soal — masing-masing dengan layout yang dirancang khusus per mode.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- [Gemini API Key](https://aistudio.google.com/apikey) dari Google AI Studio
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
| `GOOGLE_CLOUD_PROJECT` | Google Cloud Project ID | `local-dev` |
| `GEMINI_MODEL` | Model Gemini yang digunakan | `gemini-1.5-flash` |
| `PORT` | Port server | `3000` |
| `USE_MEMORY_STORE` | `true` untuk pakai in-memory repo (no Firestore) | `false` |

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
  -e GOOGLE_CLOUD_PROJECT=your-project \
  belajar-bareng-ai
```

## ☁️ Deploy ke Cloud Run

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh your-project-id
```

## 🏗️ Tech Stack

- **Next.js 14** (App Router) — Full-stack framework
- **Tailwind CSS** + **Framer Motion** — UI & animasi
- **Gemini 1.5 Flash** — AI engine (multimodal untuk PDF)
- **mammoth ^1.7** — Konversi DOCX → Markdown server-side (no AI token)
- **Firestore** — Session persistence
- **fast-check** — Property-based testing
- **Google Cloud Run** — Deployment

## 📁 Struktur Project

```
app/
  ├── api/                  → Health, session, upload, chat (SSE), summary
  ├── chat/                 → Chat page (header + LayoutRouter)
  └── summary/              → Session summary
components/
  ├── layouts/              → LayoutRouter + 4 layout per-mode
  │   ├── LayoutRouter.tsx
  │   ├── PenjelasLayout.tsx       (chat + uploader inline)
  │   ├── SokratikLayout.tsx       (two-column dengan rail kanan)
  │   ├── KuisLayout.tsx           (split + AIStatusBox)
  │   └── LatihanLayout.tsx        (attempt-first + steps rail)
  ├── DocumentUploader.tsx  → PDF + DOCX uploader
  ├── AIStatusBox.tsx       → Kotak persegi 280–320px sticky (Kuis)
  ├── QuizWizard.tsx        → Setup wizard 3 langkah
  └── ...                   → Komponen mode-specific lainnya
lib/
  ├── markdown-compiler.ts  → PDF (Gemini) | DOCX (mammoth) → Markdown
  ├── quiz-state-machine.ts → Pure reducer (idle→...→completed)
  ├── prompt-builder.ts     → Compile compiledMarkdown only (no raw bytes)
  └── ...                   → Firestore, validation, SSE, types
hooks/                      → useSession, useChatStream
tests/                      → Property tests (fast-check)
deploy/                     → Cloud Run deploy script
```

## 🎓 Fitur

1. **Dual Input** — Upload **PDF atau DOCX** atau ketik topik bebas
2. **4 Layout Belajar Berbeda** — Penjelas (chat), Sokratik (rail kanan dengan depth + hints), Kuis (split + AI status box), Latihan (attempt-first + steps)
3. **Layout Router** — Tiap mode punya layout sendiri; switch mode tidak menghapus history
4. **Markdown Compiler** — File di-compile ke Markdown sebelum prompt (hemat token, byte mentah tidak pernah ikut)
5. **Quiz Wizard** — State machine eksplisit: upload → tipe → jumlah → run
6. **Streaming AI** — Respons real-time via SSE
7. **Session Summary** — Ringkasan akhir sesi belajar
8. **Tanpa Registrasi** — Langsung pakai, zero friction

---

*Dibuat untuk kompetisi #JuaraVibeCoding Google 2026*
