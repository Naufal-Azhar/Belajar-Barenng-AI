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



## ⏳ Yang BELUM Dikerjakan (Phase 5: Firebase Auth — ditunda)

> Status: **deferred to post-hackathon**. Tasks 13-16 sudah didesain di plan, tinggal eksekusi.
> Semua kode bisa kompil tanpa task ini — app jalan dalam mode anonim (deviceId).
> Kalau mau aktifkan: setup Firebase Console (~10 menit) + saya kerjakan kode (~3-4 jam).

### Setup Eksternal yang Wajib Dilakukan User Sebelum Mulai

1. **Buat Firebase project** di [console.firebase.google.com](https://console.firebase.google.com) (gratis, 5 menit)
2. **Enable Google Sign-in** di Authentication → Sign-in method → Google → Enable
3. **Tambah Web app** di Project Settings → General → Your apps → Add Web app
4. **Copy 4 config keys** ke `.env.local` (template sudah ada di `.env.example`):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
5. **Generate service account JSON** di Project Settings → Service Accounts → Generate new private key. Simpan sebagai `service-account-key.json` di root project (sudah masuk `.gitignore`).
6. **Authorize domain** di Authentication → Settings → Authorized domains. Tambah domain Cloud Run / preview kalau deploy.

---

### Task 13 — Firebase Auth Client Setup + AuthContext

**Tujuan**: Setup auth client-side. User bisa klik "Login dengan Google" → popup Google OAuth → app dapat ID token + user info (email, displayName, avatar).

**Yang dibikin**:
- Install package: `npm install firebase`
- File baru `lib/firebase-client.ts`:
  - `initializeApp()` dari env vars
  - Export `auth` instance
- File baru `contexts/AuthContext.tsx`:
  - `<AuthProvider>` wrapper untuk root layout
  - Expose state: `{ user: User | null, idToken: string | null, signInWithGoogle: () => Promise<void>, signOut: () => Promise<void>, isLoading: boolean }`
  - Listener `onAuthStateChanged` untuk sync state otomatis
  - Token cached + auto-refresh setiap 55 menit
- File baru `lib/api-client.ts`:
  - `authedFetch(url, opts)` helper
  - Logic: kalau ada `idToken` → kirim `Authorization: Bearer <token>`, else fallback ke `X-Device-Id: <uuid>`
- Modifikasi:
  - `app/layout.tsx` — wrap `<children>` dengan `<AuthProvider>`
  - `hooks/useSessions.ts` — replace `fetch()` calls dengan `authedFetch()`
  - `hooks/useSession.ts` — replace `fetch()` calls dengan `authedFetch()`

**Tests**: `tests/properties/api-client.test.ts` (mock auth state, verify header switching)

**Demo**: Tombol login muncul di pojok app, klik → popup Google, sukses → user info terlihat di console / React DevTools.

**Estimasi**: ~1.5 jam coding + 30 menit testing

---

### Task 14 — Firebase Admin SDK + Auth Middleware (server)

**Tujuan**: Server bisa verify ID token dari client, jadi tahu "ini request dari user UID xxx" untuk filter data Firestore.

**Yang dibikin**:
- Install package: `npm install firebase-admin`
- File baru `lib/firebase-admin.ts`:
  - Initialize Firebase Admin SDK pakai service account JSON
  - Di Cloud Run: pakai default service account via Application Default Credentials
  - Di local dev: pakai file `service-account-key.json` (sudah di-gitignore)
- Modifikasi `lib/auth-server.ts` — `resolveOwner(req)` jadi:
  ```ts
  async function resolveOwner(req): Promise<Owner> {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = await firebaseAdmin.auth().verifyIdToken(authHeader.slice(7));
        return { ownerType: 'user', ownerId: decoded.uid };
      } catch {
        // Fall through to deviceId
      }
    }
    const deviceId = req.headers.get('x-device-id');
    if (deviceId) return { ownerType: 'device', ownerId: deviceId };
    throw new UnauthorizedError();
  }
  ```
- Tidak butuh modifikasi handler API — `resolveOwner` sudah dipanggil di semua endpoint, hanya behavior-nya yang berubah

**Tests**: `tests/properties/auth-server.test.ts` (mock token verification, verify header parsing, fallback logic)

**Demo**: Login di client, network tab show `Authorization: Bearer eyJhb...` header → server logs show resolved `userId` (Firebase UID) instead of deviceId.

**Estimasi**: ~1 jam coding + 30 menit testing

---

### Task 15 — Login Button di Sidebar + Migrasi Sesi Anonim

**Tujuan**: User bisa login lewat tombol di sidebar footer. Sesi-sesi anonim yang udah dibuat sebelumnya otomatis "diklaim" ke akun user setelah login.

**Yang dibikin**:
- Komponen `<LoginSlot />` baru, di-pass sebagai `loginSlot` prop ke `<Sidebar>`:
  - Anonymous: tombol "Login dengan Google" + icon
  - Logged-in: avatar + email + tombol "Keluar" (Logout)
- File baru `app/api/sessions/migrate/route.ts`:
  - `POST` body: `{ deviceId: string }`
  - Auth: caller HARUS sudah login (ownerType === 'user')
  - Logic: panggil `repo.migrateOwner(deviceId, callerUid)`
  - Response: `{ migrated: N }` (jumlah sesi yang dipindah)
- Modal konfirmasi sebelum migrate: **"Sambungkan {N} sesi anonim ke akun {email}?"** dengan tombol [Sambungkan] [Lewati]
- Wire di `app/chat/page.tsx`:
  - On login: cek apakah ada sesi `ownerType:'device'` → kalau ada, tampilkan modal
  - User klik "Sambungkan" → POST `/api/sessions/migrate` → sukses → refresh sidebar

**Tests**: `tests/properties/api-sessions-migrate.test.ts` (idempotency, verify only callee's deviceId sessions migrated, cross-user safety)

**Demo**: Buat 3 sesi anonim → klik Login → popup Google → sukses → modal "Sambungkan 3 sesi?" muncul → klik Sambungkan → sidebar refresh, semua 3 sesi sekarang `ownerType:'user'` di backend.

**Estimasi**: ~1.5 jam coding + 30 menit testing

---

### Task 16 — Multi-Device Sync Verification + Login State UI

**Tujuan**: Verifikasi end-to-end bahwa sesi user sync antar device + UX polish untuk indikator login state.

**Yang dibikin**:
- Indikator UI di sidebar:
  - Cloud icon ☁️ + "Tersinkronisasi" subtle text saat user logged-in
  - Hidden saat anonymous
- Toast notification "Tersinkronisasi ✓" setelah login berhasil (~3 detik)
- Cache invalidation di `useSessions`:
  - On `idToken` change (login/logout) → trigger `refresh()` otomatis
  - Anonymous → user transition: list berubah dari deviceId-bound jadi userId-bound
  - User → anonymous (logout) transition: list balik ke deviceId-bound
- Edge case handling:
  - Browser B (device baru) login dengan akun yang sama → fetch sesi userId-bound (sesi yang udah di-migrate dari Browser A muncul)
  - Tapi sesi anonim Browser A yang BELUM di-migrate tetap terisolasi di Browser A's deviceId
  - Sesi anonim Browser B (sebelum login) tidak ke-mix sama sesi user Browser A

**Tests**: Manual cross-browser test (Playwright kalau ada waktu), atau dokumentasi langkah test:
1. Browser A: login akun X → buat sesi "Topic A"
2. Browser B (incognito): buka app → login akun X → cek sidebar → "Topic A" muncul
3. Browser B: buat sesi anonim sebelum login → "Topic B" — verify bahwa "Topic B" terikat deviceId Browser B, tidak muncul di Browser A
4. Browser B: login → modal migrate → klaim "Topic B" → sekarang Browser A reload → "Topic B" muncul juga

**Demo**: 2 device berbeda pakai akun Google yang sama, sesi sync otomatis lewat Firestore.

**Estimasi**: ~1 jam coding + 1 jam manual testing

---

### Total Estimasi Phase 5: ~6-7 jam dev work

Hasil akhir kalau Phase 5 dikerjakan:
- ✅ Login Google dengan 1 klik (gratis tier Firebase Auth)
- ✅ Sesi sync antar device (laptop ↔ HP ↔ tablet)
- ✅ Migrasi seamless dari anonim ke akun
- ✅ User bisa logout, sesi user-bound sembunyi sampai login lagi
- ✅ Anti-spam: rate-limit per `userId` di future task
- ✅ Production-ready dengan zero biaya tambahan (Firebase Auth gratis untuk Google sign-in unlimited)

### Catatan Penting

1. **Firebase Auth gratis** untuk Google sign-in & email/password sign-in. Yang berbayar hanya Phone Auth (SMS). Kita tidak perlu Phone Auth.
2. **Tidak butuh database baru** — Firestore yang sudah ada cukup. Auth user info hanya butuh `userId` (UID) yang dikasih Firebase Auth → di-store sebagai field di Session document.
3. **Kompatibilitas**: kode existing tetap jalan tanpa Firebase Auth setup. Kalau env vars Firebase kosong, app gracefully fall back ke deviceId mode.
4. **Service account JSON aman**: sudah di-gitignore (`service-account-key.json`). Untuk production Cloud Run, pakai default service account via ADC — tidak perlu file JSON di filesystem.



## update 25/5/2026 (Senin) — Universal Profile

> *Hapus pemisahan profil SMA vs Mahasiswa, jadikan satu profil universal*

---

### Konteks
Onboarding sebelumnya memaksa user pilih antara "Pelajar SMA" atau "Mahasiswa" sebelum bisa mulai. Pemisahan ini terasa rigid (tidak inklusif untuk pembelajar mandiri / profesional) dan menambah friction. Setelah refactor, single button "Mulai Belajar →" langsung mulai sesi tanpa minta jenjang.

### Yang Dikerjain (9 task — 100%)

#### Phase 1: Soften schema (Task 1-2)
- **Task 1**: Field `profileType` di-mark optional di seluruh layer (Session, validation, repository) — non-breaking transition.
- **Task 2**: `PROFILE_INSTRUCTION` map dihapus dari prompt builder, ganti dengan satu `UNIVERSAL_LEARNER_INSTRUCTION` const yang netral untuk semua jenjang.

#### Phase 2: UI cleanup (Task 3-4)
- **Task 3**: `OnboardingScreen.tsx` di-simplify — hapus state `selected`, hapus 2-button picker (Pelajar SMA / Mahasiswa), tinggal satu tombol "Mulai Belajar →" yang langsung enabled.
- **Task 4**: Dashboard card hapus badge profil (Mahasiswa/SMA). Sekarang card hanya tampil judul + mode + relative time.

#### Phase 3: API + hooks (Task 5-6)
- **Task 5**: `useSessions.createSession()` & `useSession.createSession()` jadi no-arg. Body POST `/api/sessions` jadi `{}`.
- **Task 6**: `POST /api/sessions` tidak lagi parse body; `buildSystemPrompt()` di `/api/chat` & `/api/summary` dipanggil tanpa arg `profile`.

#### Phase 4: Data migration (Task 7)
- **Task 7**: Bikin 2 migration script di `deploy/`:
  - `migrate-dev-sessions.ts` — cleanup `.dev-sessions.json` (in-memory store) dengan auto-backup ke `.dev-sessions.backup.json`. Idempotent.
  - `migrate-remove-profile-type.ts` — cleanup Firestore `sessions/*` pakai `FieldValue.delete()` dalam batch (max 500 ops). Idempotent — doc tanpa field di-skip.
  - Install `tsx@4.19.2` sebagai devDep, tambah scripts `npm run migrate:dev` & `npm run migrate:firestore`.
  - Verified migrate:dev: Processed 3, Migrated 3, Errors 0. Re-run: Migrated 0 (idempotent confirmed).

#### Phase 5: Final cleanup (Task 8-9)
- **Task 8**: Hapus total `ProfileType` type alias, `profileTypeSchema`, field `profileType?` dari `Session`, semua import statements, dan semua test fixture references. `createSessionBodySchema` simplified jadi `z.object({}).passthrough()`. Test "returns 400 kalau profileType invalid" dihapus karena tidak relevan lagi.
- **Task 9**: End-to-end verification + update PROGRES.md & README.md.

### Hasil
- **79/80 → 79 tests pass** (drop 1 test: "returns 400 kalau profileType invalid" — not relevant after refactor)
- **TypeScript strict mode clean** (`npx tsc --noEmit` → no errors)
- **Zero references** ke `ProfileType` / `profileType` / `'sma'` / `'mahasiswa'` di app code (sisa 8 references hanya di `deploy/migrate-*.ts` — correct, mereka pakai sebagai string key untuk migration)
- **Backward compat untuk sesi lama**: Firestore docs yang sudah punya field `profileType` tetap bisa di-read (field tinggal diabaikan). Migration script tinggal dijalankan di prod kapan pun.
- **Onboarding flow**: Single click → langsung create + redirect ke `/chat?sessionId=xxx`

### Modified Files (26 file)
- Domain: `lib/types.ts`, `lib/validation.ts`, `lib/prompt-builder.ts`
- Repo: `lib/session-repository.ts`, `lib/session-repository-memory.ts`
- API: `app/api/sessions/route.ts`, `app/api/chat/route.ts`, `app/api/summary/route.ts`
- Hooks: `hooks/useSession.ts`, `hooks/useSessions.ts`
- UI: `components/OnboardingScreen.tsx`, `components/Dashboard.tsx`
- Pages: `app/page.tsx`, `app/chat/page.tsx`, `app/review/page.tsx`
- Migration: `deploy/migrate-dev-sessions.ts`, `deploy/migrate-remove-profile-type.ts`
- Config: `package.json` (+ tsx devDep, + 2 npm scripts)
- Tests (7 file fixture cleanup): `session-repository.test.ts`, `api-sessions-list.test.ts`, `api-sessions-crud.test.ts`, `property-19-token-saving.test.ts`, `property-17-layout-router.test.tsx`, `sidebar.test.tsx`, `use-sessions.test.tsx`
- Data: `.dev-sessions.json` (migrated, backup at `.dev-sessions.backup.json`)
- Docs: `README.md`, `PROGRES.md`

### Cara Jalanin Migration di Production (Future)
```bash
# Setelah deploy code baru, jalanin sekali:
GOOGLE_CLOUD_PROJECT=<your-project> \
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json \
npm run migrate:firestore
```
Output: `Processed: N, Migrated: M, Errors: 0`. Idempotent — aman dijalankan ulang.



## update 25/5/2026 (Senin malam) — Fix JSON Mentah & Cross-Mode Rendering

> *Bug fix + UX improvement: pesan AI dari mode lain nggak lagi nampil sebagai JSON mentah*

---

### Konteks Bug
User screenshot bug: lagi di mode **Sokratik**, tapi pesan AI sebelumnya (yang dibuat di mode Penjelas) muncul sebagai JSON mentah panjang `{"kind":"explainer","title":"Yuk, Ngobrolin Ekonomi!",...}` di chat history. Bukan kartu UI yang rapi.

Setelah investigasi, ada **3 masalah** yang saling terhubung:
1. **SokratikLayout** cuma tahu cara render payload `socratic`. Payload jenis lain (explainer, quiz, latihan) jatuh ke `MessageBubble` yang nge-print `msg.content` mentah-mentah — dan `content`-nya itu hasil `JSON.stringify(payload)`.
2. **KuisLayout & LatihanLayout** lebih parah — mereka nggak render history chat sama sekali. Pesan dari mode lain hilang total dari layar.
3. **Pesan auto-trigger** kayak "Tolong perdalam bagian inti..." (di-generate otomatis pas user klik tombol "Lebih dalam") nampil sama persis kayak ketikan user manual. Bikin chat terlihat ramai dengan pesan template berulang.

### Yang Dikerjain (9 task — 100%)

#### Phase 1: Plumbing data (Task 1-3)
- **Task 1**: Tambah field `intent?: UserMessageIntent` & `actionLabel?: string` opsional di `Message` type. Bikin union `UserMessageIntent` dengan 13 nilai (manual / ask-deeper / ask-term / confused / ask-similar / ask-harder / dst.). Update `useChatStream.sendMessage` agar terima parameter intent + actionLabel. Reducer di `useSession` sudah pakai spread pattern jadi otomatis ke-propagate.
- **Task 2**: Bikin komponen baru `<ActionChip>` — render pesan auto-trigger sebagai chip kompak dengan icon + label (mis. `💡 Lebih dalam: Inti`, `🤔 Saya bingung`). Lebih kecil dan lebih lembut dibanding bubble user oranye, jadi visual nya kelihatan kayak "aksi tombol", bukan ketikan.
- **Task 3**: Update 13 callsite handler di `app/chat/page.tsx`, `KuisLayout`, `PenjelasLayout` untuk kirim metadata intent/actionLabel saat panggil `sendMessage`. Extend `onSend` signature jadi `(text, opts?)` di `ModeLayoutProps` supaya konsisten.

#### Phase 2: Cross-mode rendering (Task 4-5)
- **Task 4**: Bikin komponen baru `<CompactPayloadCard>` — render preview ringkas dari payload AI tanpa interaksi. Punya badge mode (`📘 Penjelas` / `🤔 Sokratik` / `📝 Kuis` / `🏋️ Latihan`), title, metadata mini (jumlah section / hint count / dst.), plus hint footer "Pindah ke mode X untuk interaksi penuh".
- **Task 5**: Bikin komponen central `<MessageRenderer>` — factory yang implement decision tree tunggal: user manual → MessageBubble; user auto-trigger → ActionChip; AI tanpa payload → MessageBubble; AI payload mode aktif → komponen full interaktif; AI payload mode lain → CompactPayloadCard. Refactor `SokratikLayout` pakai MessageRenderer (fix bug utama screenshot user).

#### Phase 3: Konsistensi & history (Task 6-8)
- **Task 6**: Refactor `<ChatStream>` (yang dipakai PenjelasLayout) supaya juga pakai MessageRenderer. Switch statement internal-nya dihapus, logic di-pusatkan ke MessageRenderer. Tambah polyfill `scrollIntoView` di `tests/setup.ts` karena jsdom nggak punya secara default.
- **Task 7**: Tambah `<KuisHistorySection>` di KuisLayout — section scrollable di atas QuizWizard / QuizComponent yang nampilin pesan-pesan sebelumnya pakai MessageRenderer. Auto-open kalau pesan ≤ 3, collapsed kalau > 3 (pakai `<details>` native).
- **Task 8**: Sama buat LatihanLayout — `<LatihanHistorySection>` di atas main two-column container.

#### Phase 4: Verifikasi (Task 9)
- **Task 9**: Final regression check. Run semua test (129/129 pass), TypeScript compile clean, production build sukses (17/17 pages generated). Bikin smoke test checklist `tests/properties/cross-mode-smoke.md` untuk manual testing scenarios.
- **Bonus fix**: Sekalian fix pre-existing Next.js 14 build error — `useSearchParams()` di `useSession.ts` perlu Suspense boundary. Wrap default export `ChatPage` dengan `<Suspense fallback={...}><ChatPageInner /></Suspense>`. Issue ini ada sebelum task ini (verified via git stash + build pada kode original), tapi sekalian fix biar production deployment bisa jalan.

### Hasil
- **129/129 tests pass** (50 test baru ditambah, 0 regresi dari 79 test existing)
- **Production build sukses** (17/17 pages generated, 0 TypeScript errors)
- **Bug screenshot user RESOLVED** — diverify dengan E2E test di `message-renderer.test.tsx` yang replikasi skenario persis: mode aktif Sokratik + payload explainer dari sebelumnya + pesan ask-deeper user. Hasilnya: CompactPayloadCard + ActionChip render rapi, tidak ada string `{"kind":"explainer"...}` mentah.
- **Back-compat 100%** — field `intent` & `actionLabel` opsional, pesan lama di Firestore tanpa field ini di-treat sebagai `intent === undefined` → fallback ke MessageBubble standar (perilaku lama dipertahankan). Tidak butuh migrasi data.
- **Server contract nggak berubah** — `intent` & `actionLabel` adalah metadata client-only, tidak dikirim ke `/api/chat`. Prompt AI nggak terpengaruh.

### Mapping Visual Singkat

**ActionChip** (pesan user auto-trigger):
| Tombol UI | Icon | Label |
|---|---|---|
| Lebih dalam tentang Inti | 💡 | Lebih dalam: Inti |
| Tanya istilah kunci | 📖 | Tanya istilah: Sumber Daya |
| Saya bingung (Sokratik) | 🤔 | Saya bingung |
| Soal serupa / lebih sulit / lebih mudah | 🔁 / 📈 / 📉 | Soal X |
| Skip soal / Soal baru / Soal berikutnya | ⏭️ / ✨ / ➡️ | label X |
| Mulai kuis | 🚀 | Mulai kuis: 5 soal mcq |
| Upload PDF/DOCX | 📎 | Upload: nama-file.pdf |
| Lanjut dari review | 🔗 | Lanjut dari review: Konsep |

**CompactPayloadCard** (pesan AI dari mode lain):
| Mode payload | Badge | Metadata yang ditampilin |
|---|---|---|
| explainer | 📘 Penjelas | X sections · Y istilah kunci |
| socratic | 🤔 Sokratik | Kedalaman X · Y petunjuk |
| quiz | 📝 Kuis | Pilihan ganda/Esai · index/total |
| latihan | 🏋️ Latihan | Tingkat X · Y langkah |

### File Baru yang Dibikin
- `components/ActionChip.tsx` — chip kompak buat pesan auto-trigger
- `components/CompactPayloadCard.tsx` — preview ringkas payload lintas mode
- `components/MessageRenderer.tsx` — factory decision tree tunggal
- `tests/properties/action-chip.test.tsx` (7 test)
- `tests/properties/compact-payload-card.test.tsx` (8 test)
- `tests/properties/message-renderer.test.tsx` (10 test, termasuk E2E replikasi bug user)
- `tests/properties/sokratik-action-chip.test.tsx` (4 test)
- `tests/properties/kuis-layout.test.tsx` (6 test)
- `tests/properties/latihan-layout.test.tsx` (5 test)
- `tests/properties/chat-stream.test.tsx` (6 test, regression)
- `tests/properties/message-intent.test.ts` (4 test)
- `tests/properties/cross-mode-smoke.md` (manual smoke test checklist)

### File yang Dimodif
- Domain: `lib/types.ts`
- Hooks: `hooks/useChatStream.ts`
- Layouts: `components/ChatStream.tsx`, `components/layouts/SokratikLayout.tsx`, `components/layouts/KuisLayout.tsx`, `components/layouts/LatihanLayout.tsx`, `components/layouts/PenjelasLayout.tsx`, `components/layouts/LayoutRouter.tsx`
- Page: `app/chat/page.tsx` (intent wiring + Suspense wrapper)
- Tests: `tests/setup.ts` (scrollIntoView polyfill)

### Catatan Penting
- **Ngga butuh migrasi Firestore** — semua field baru opsional, sesi lama otomatis kompatibel.
- **CompactPayloadCard sengaja non-interaktif** — kalau user mau klik istilah / ask deeper / dst., harus pindah balik ke mode yang sesuai. Ini sesuai pilihan UX user: "fokus tetap di pola mode aktif sekarang, history mode lain kelihatan tapi nggak dominan".
- **Auto-trigger detection di MessageRenderer**: branch pertama dicek dulu (`intent && intent !== 'manual'`), baru fall through ke logic AI payload. Jadi pesan user auto-trigger nggak akan salah dirender sebagai bubble manual.
