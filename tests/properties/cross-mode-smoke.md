# Smoke Test Manual — Cross-Mode Message Rendering

Skenario manual untuk verifikasi behavior end-to-end fitur baru
(ActionChip, CompactPayloadCard, MessageRenderer + history sections).
Run di dev server (`npm run dev`) dengan `USE_MEMORY_STORE=true` atau Firestore.

## Checklist

### 1. Bug asli: JSON mentah di Sokratik (FIX VERIFICATION)

- [ ] Buat sesi baru, mode default Penjelas.
- [ ] Tanya "jelaskan ekonomi makro" → AI balas dengan ExplainerComponent
  full (Inti/Analogi/Contoh/TL;DR + key terms). ✅
- [ ] Klik tombol mode **Sokratik** di header.
- [ ] **Expected**: Pesan AI explainer sebelumnya ditampilkan sebagai
  **CompactPayloadCard** dengan badge "📘 Penjelas" + judul + metadata
  (`X sections · Y istilah kunci`) + hint "Pindah ke mode Penjelas
  untuk interaksi penuh". **TIDAK BOLEH ada JSON mentah**.

### 2. ActionChip muncul untuk pesan auto-trigger

- [ ] Di Penjelas, klik tombol **"Lebih dalam tentang Inti"** di kartu.
  - Expected: Bubble user di kanan, **muncul sebagai chip kompak**
    `💡 Lebih dalam: Inti` (border tipis, opacity rendah, BUKAN bubble
    oranye besar).
- [ ] Klik chip istilah (e.g. "Sumber Daya Terbatas") di Explainer.
  - Expected: Chip `📖 Tanya istilah: Sumber Daya Terbatas`.
- [ ] Pindah ke Sokratik, klik tombol **"Saya bingung"**.
  - Expected: Chip `🤔 Saya bingung`.
- [ ] Mode Kuis, mulai wizard, lalu setelah jawab klik **"Soal serupa"**.
  - Expected: Chip `🔁 Soal serupa`.
- [ ] Klik **"Lebih sulit"**.
  - Expected: Chip `📈 Soal lebih sulit`.
- [ ] Mode Latihan, klik **"Lebih mudah"**.
  - Expected: Chip `📉 Soal lebih mudah`.
- [ ] Upload PDF/DOCX di Penjelas.
  - Expected: Chip `📎 Upload: nama-file.pdf`.

### 3. Pesan user manual tetap render bubble standar

- [ ] Ketik manual "halo, kamu siapa?" di composer Penjelas.
  - Expected: Bubble user oranye standar (BUKAN chip).
- [ ] Ketik manual di Sokratik.
  - Expected: Bubble user standar (BUKAN chip).

### 4. KuisLayout history section

- [ ] Sesi baru → Penjelas → tanya 2 hal (2 explainer payloads).
- [ ] Pindah ke **Kuis** mode.
- [ ] **Expected**:
  - History section di atas QuizWizard, dengan summary "Riwayat sesi (N pesan)".
  - 2 compact explainer cards muncul.
  - Auto-open kalau pesan ≤ 3, collapsed kalau > 3.
- [ ] Mulai wizard → kirim quiz-start → ActionChip 🚀 muncul di history.
- [ ] QuizComponent di leftColumn render normal.

### 5. LatihanLayout history section

- [ ] Sesi baru → Penjelas → tanya 1 hal.
- [ ] Pindah ke **Latihan** mode.
- [ ] **Expected**:
  - History section di atas EmptyLatihanHint.
  - 1 compact explainer card muncul.
- [ ] Klik EmptyLatihanHint untuk trigger soal.
- [ ] Active LatihanComponent muncul di main, history tetap di atas.

### 6. PenjelasLayout (regression Task 6)

- [ ] Single-mode Penjelas: tanya 3 hal → 3 ExplainerComponent full.
  - Expected: Semua kartu render penuh & interaktif.
- [ ] Pindah ke Sokratik, kirim 1 pesan → balik ke Penjelas.
  - Expected: Pesan socratic dari mode lain muncul sebagai
    CompactPayloadCard di chat history Penjelas.

### 7. Reload session — back-compat

- [ ] Refresh browser di tengah sesi yang punya pesan auto-trigger.
- [ ] **Expected**: Pesan dari Firestore di-hydrate, ActionChip tetap
  render dengan benar (intent + actionLabel persisted).
- [ ] Buka sesi LAMA (sebelum perubahan ini) yang nggak punya field
  `intent` di pesan-nya.
- [ ] **Expected**: Pesan lama tetap render sebagai MessageBubble standar
  (graceful fallback).

### 8. Accessibility (a11y) audit

- [ ] **Tab navigation**: Tab masuk akal, focus visible (border atau
  outline pada elemen interaktif).
- [ ] **Screen reader**: ActionChip punya `aria-label="Aksi tombol: ..."`.
  CompactPayloadCard punya `aria-label="Pesan ringkas dari mode ..."`.
- [ ] **Details collapse**: `<summary>` di history section bisa di-toggle
  via Enter/Space (native semantics).
- [ ] **Color contrast**: Chip + compact card teks tetap legible di
  light/dark mode (kalau ada toggle).

## Catatan Pre-existing Issues (RESOLVED dalam Task 9)

- **Build pre-render `/chat`**: `useSearchParams()` di `useSession.ts`
  butuh dibungkus dalam `<Suspense>` boundary (Next.js 14 requirement).
  Issue ini ada **sebelum** task ini di-eksekusi (verified via git stash
  + build pada kode original). **Sudah di-fix di Task 9**: `app/chat/page.tsx`
  default export sekarang `ChatPage` yang wrap `ChatPageInner` dengan
  `<Suspense fallback={...}>`. Production build sukses (17/17 pages
  generated).

## Coverage Test Otomatis

Run via `npm run test:run`:

| File Test | Tests | Status |
|---|---|---|
| `message-intent.test.ts` | 4 | ✅ |
| `action-chip.test.tsx` | 7 | ✅ |
| `sokratik-action-chip.test.tsx` | 4 | ✅ |
| `compact-payload-card.test.tsx` | 8 | ✅ |
| `message-renderer.test.tsx` | 10 | ✅ (termasuk E2E replikasi bug user) |
| `chat-stream.test.tsx` | 6 | ✅ |
| `kuis-layout.test.tsx` | 6 | ✅ |
| `latihan-layout.test.tsx` | 5 | ✅ |
| **Total baru** | **50** | **✅** |
| **Total semua test repo** | **129** | **✅ (regresi 0)** |
