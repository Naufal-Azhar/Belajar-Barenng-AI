Konteks "publish dulu baru dinilai async oleh juri" memperkuat pilihan B kamu — judge akan browse santai, jadi friction-free anonymous preview itu kunci.
  Sekarang saya tulis plan lengkapnya.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Implementation Plan — Multi-Conversation Sessions (BelajarBareng AI)
 
  Problem Statement
 
  Aplikasi BelajarBareng AI saat ini didesain sebagai single-active-session: satu pengguna hanya bisa punya satu sesi belajar aktif di-localStorage        
  (belajar.sessionId). Setelah "Akhiri Sesi", sessionId tidak dibersihkan, sehingga pengunjung yang kembali ke halaman utama otomatis di-redirect ke chat  
  lama yang sudah selesai. Tidak ada UI untuk:
 
  - Melihat daftar sesi belajar yang pernah dibuat
  - Membuka kembali sesi lama
  - Membuat sesi baru tanpa "menggantikan" sesi aktif
  - Sinkronisasi sesi antar device
 
  Ini membatasi UX dan ekspektasi dasar pengguna modern (Claude/NotebookLM/ChatGPT mental model), serta merugikan demo publik karena pengunjung tidak bisa 
  eksplorasi multi-topik dalam satu kunjungan.
 
  Requirements
 
  Dirumuskan dari diskusi requirement gathering:
 
  ┌─────┬───────────────────┬───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐      
  │ ID  │ Keputusan         │ Detail                                                                                                                │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R1  │ UX style          │ 1c: Hybrid — Dashboard / (grid sesi) + Sidebar persistent di /chat (mobile: drawer)                                   │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R2  │ Identifikasi user │ 2a: Query param /chat?sessionId=xxx                                                                                   │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R3  │ Auth model        │ 3b: Hybrid pintar — Anonymous = full features terikat deviceId. Login Google = sync antar device + claim sesi anonim. │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R4  │ Title strategy    │ 1=a: First message snippet — 40 karakter pertama dari user message pertama                                            │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R5  │ CRUD sesi         │ 3c: Full — Resumable + rename + delete (soft-delete via isArchived)                                                   │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R6  │ Skala target      │ Publish publik untuk dinilai juri async, ekspektasi puluhan-ratusan visitor                                           │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R7  │ Budget cloud      │ $5 GCP credit, harus tetap di free tier Firestore + Cloud Run                                                         │      
  ├─────┼───────────────────┼───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤      
  │ R8  │ Compatibility     │ Sesi lama di Firestore (yang belum punya ownerId) tidak boleh nge-crash app — graceful skip                           │      
  └─────┴───────────────────┴───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘      
 
  Background
 
  Hasil eksplorasi codebase yang relevan:
 
  - Stack: Next.js 14 App Router + Firestore (@google-cloud/firestore) + in-memory fallback (USE_MEMORY_STORE=true) + Gemini API
  - Existing storage abstractions: lib/session-repository.ts (SessionRepository interface), lib/session-repository-memory.ts — sudah dipisah dari
  implementation, mudah extend
  - Existing identity: lib/device-id.ts sudah ada — generate UUID per browser, disimpan di localStorage.belajar.deviceId. Ini sudah dipakai oleh fitur     
  FlashCard (FSRS), kita tinggal pakai juga untuk Session
  - Existing schema: lib/types.ts Session interface — perlu di-extend tanpa breaking change
  - Existing routing: / (onboarding/auto-redirect), /chat, /summary, /review — perlu refactor / jadi dashboard, /chat baca query param
  - Existing hooks: hooks/useSession.ts pakai useReducer — perlu refactor untuk multi-session awareness
  - Test infra: Vitest + fast-check di tests/ — bisa lanjut TDD style
  - Auth library: belum ada — perlu install firebase (client) + firebase-admin (server)
  - Firebase Auth gratis untuk Google sign-in, tidak butuh database baru — userId tinggal jadi field di Firestore Session yang sudah ada
 
  Proposed Solution
 
  Arsitektur Tinggi
 
  graph TB
    subgraph Client
      Dashboard["/  (Dashboard - SessionList + Login banner)"]
      ChatPage["/chat?sessionId=xxx (Sidebar + LayoutRouter)"]
      Sidebar["Sidebar Component (list + new + rename + delete + login)"]
      AuthCtx["AuthContext (deviceId | userId)"]
    end
    subgraph API
      SessAPI["/api/sessions (GET list, POST create)"]
      SessByIdAPI["/api/sessions/:id (GET, PATCH, DELETE)"]
      MigrateAPI["/api/sessions/migrate (POST)"]
      ChatAPI["/api/chat (existing - tambah auto-title logic)"]
    end
    subgraph Server
      AuthMW["Auth Middleware (resolve ownerType+ownerId)"]
      Repo[SessionRepository]
    end
    subgraph Storage
      Firestore[(Firestore: sessions/* with ownerType, ownerId, title)]
      FBAuth[(Firebase Auth - Google OAuth)]
    end
 
    Dashboard --> SessAPI
    ChatPage --> Sidebar
    Sidebar --> SessAPI
    Sidebar --> SessByIdAPI
    AuthCtx --> FBAuth
    AuthCtx --> MigrateAPI
    SessAPI --> AuthMW
    SessByIdAPI --> AuthMW
    MigrateAPI --> AuthMW
    AuthMW --> Repo
    Repo --> Firestore
 
  State Model: Owner Resolution
 
  stateDiagram-v2
    [*] --> Anonymous: First visit (deviceId generated)
    Anonymous --> Anonymous: Use full features (sessions tagged ownerType=device)
    Anonymous --> Authenticated: Click "Login dengan Google" + migration
    Authenticated --> Authenticated: All sessions (old + new) tagged ownerType=user
    Authenticated --> Anonymous: Logout (sessions tetap di server, tidak terlihat sampai login lagi)
 
  Schema Changes
 
  // lib/types.ts (additions)
  interface Session {
    // EXISTING — tidak diubah
    sessionId: string;
    profileType: ProfileType;
    topic?: string;
    currentMode: LearningMode;
    documentContext?: DocumentContext;
    quizState?: QuizState;
    quizConfig?: QuizConfig;
    startedAt: string;
    endedAt?: string;
    summary?: SummaryPayload;
    // NEW
    ownerType: 'device' | 'user';   // diskriminator
    ownerId: string;                 // deviceId atau Firebase UID
    title?: string;                  // auto-generated dari first user message
    isArchived?: boolean;            // soft delete
    updatedAt: string;               // ISO; untuk sort di sidebar
  }
 
  API Surface
 
  ┌────────┬───────────────────────┬──────────────────────────────────────┬─────────────────────────────────────────────────┐
  │ Method │ Path                  │ Body / Query                         │ Returns                                         │
  ├────────┼───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ GET    │ /api/sessions         │ header: auth                         │ Session[] (filtered by owner, exclude archived) │
  ├────────┼───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ POST   │ /api/sessions         │ { profileType } + auth               │ { sessionId, currentMode }                      │
  ├────────┼───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ GET    │ /api/sessions/:id     │ auth                                 │ { session, messages } (403 if not owner)        │
  ├────────┼───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ PATCH  │ /api/sessions/:id     │ { title } + auth                     │ { ok: true }                                    │
  ├────────┼───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ DELETE │ /api/sessions/:id     │ auth                                 │ { ok: true } (soft delete via isArchived)       │
  ├────────┼───────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────┤
  │ POST   │ /api/sessions/migrate │ { deviceId } + auth (must be userId) │ { migrated: N }                                 │
  └────────┴───────────────────────┴──────────────────────────────────────┴─────────────────────────────────────────────────┘
 
  Existing /api/session (singular, query-by-id) akan di-keep dulu untuk backward-compat, lalu deprecated di task akhir.
 
  Auth Middleware Pattern
 
  // lib/auth-server.ts (server-side)
  async function resolveOwner(req: NextRequest): Promise<Owner> {
    const authHeader = req.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.slice(7);
      const decoded = await firebaseAdmin.auth().verifyIdToken(idToken);
      return { ownerType: 'user', ownerId: decoded.uid };
    }
    // Fallback ke deviceId via header
    const deviceId = req.headers.get('x-device-id');
    if (!deviceId) throw new Error('No identity');
    return { ownerType: 'device', ownerId: deviceId };
  }
 
  Client wrapper utk fetch:
 
  // lib/api-client.ts
  async function authedFetch(url, opts = {}) {
    const headers = { ...opts.headers };
    const token = await getCurrentIdToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    else headers['X-Device-Id'] = getDeviceId();
    return fetch(url, { ...opts, headers });
  }
 
  Task Breakdown
 
  Phase 1: Backend Foundation (Schema + APIs)
 
  Task 1: Extend Session schema + Repository methods (backward-compat)
 
  - Objective: Tambah field ownerType, ownerId, title, isArchived, updatedAt di lib/types.ts. Update SessionRepository interface dengan method listByOwner,
  updateTitle, archive. Implementasi di FirestoreSessionRepository + InMemorySessionRepository.
  - Implementation guidance:
    - Field ownerType/ownerId jadi required di schema baru, tapi create() accept default fallback (ownerType: 'device', ownerId: 'legacy') untuk session   
  lama yang dibaca (graceful migration).
    - listByOwner(ownerType, ownerId): Firestore query where('ownerType', '==', x).where('ownerId', '==', y).where('isArchived', '!=',
  true).orderBy('updatedAt', 'desc'). Buat composite index di Firestore.
    - archive(sessionId): set isArchived: true + updatedAt: now. Tidak hard delete.
 
  - Test requirements:
    - Property test: create → listByOwner → contains session
    - archive → listByOwner → does NOT contain
    - Rename via updateTitle → get → title updated
    - Sessions dengan owner berbeda tidak muncul di list satu sama lain
 
  - Demo: Run npm test → semua test pass. Session interface kompil dengan strict mode.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 2: API endpoint GET /api/sessions (list)
 
  - Objective: Bikin route handler baru di app/api/sessions/route.ts. Resolve owner via header (sementara pakai X-Device-Id saja, Firebase Auth ditambah di
  Phase 5). Return list dari repo.listByOwner().
  - Implementation guidance:
    - File baru: app/api/sessions/route.ts (plural). app/api/session/route.ts (singular) tetap exist sementara.
    - Helper di lib/auth-server.ts versi minimal: read X-Device-Id, return {ownerType:'device', ownerId}. Firebase Auth integration nanti di Task 14.      
    - Return shape: { sessions: Session[] } — exclude documentContext.compiledMarkdown (heavy field) dari list response, hanya field metadata.
 
  - Test requirements:
    - Integration test: create 2 sessions deviceId A + 1 session deviceId B → GET /api/sessions dengan X-Device-Id: A returns 2.
    - Missing X-Device-Id header → 400.
 
  - Demo: curl -H "X-Device-Id: test-device" http://localhost:3000/api/sessions returns array.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 3: Refactor POST /api/sessions (create) untuk inject owner
 
  - Objective: Refactor existing session creation di app/api/session/route.ts menjadi app/api/sessions/route.ts. Body sama (profileType), tapi sekarang    
  baca X-Device-Id header dan simpan sebagai ownerType: 'device', ownerId: deviceId.
  - Implementation guidance:
    - Set title: undefined (akan diisi auto setelah first message di Task 5).
    - Set updatedAt: startedAt.
    - Update useSession hook + app/page.tsx untuk kirim X-Device-Id saat POST.
    - Hapus /api/session POST endpoint setelah migration (atau forward ke /api/sessions).
 
  - Test requirements:
    - POST tanpa device-id → 400.
    - POST dengan device-id → returns sessionId, repo.get() shows ownerId = device-id.
 
  - Demo: Buat 2 session lewat UI, check Firestore (atau .dev-sessions.json) → kedua session punya ownerType: 'device' dan ownerId sama.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 4: API endpoints GET/PATCH/DELETE /api/sessions/:id
 
  - Objective: Bikin dynamic route app/api/sessions/[sessionId]/route.ts. Implement GET (load detail+messages), PATCH (rename), DELETE (soft archive).     
  Semua dengan ownership check.
  - Implementation guidance:
    - Ownership check: if (session.ownerId !== resolvedOwnerId) return 403.
    - PATCH body schema (zod di lib/validation.ts): { title: string().min(1).max(100) }.
    - DELETE = call repo.archive(sessionId), bukan hard delete.
    - GET: deprecate app/api/session/route.ts?id= setelah ini selesai (forward ke /sessions/:id).
 
  - Test requirements:
    - PATCH dengan owner berbeda → 403.
    - DELETE → session tidak muncul di subsequent listByOwner.
    - GET archived session → 404 (atau return dengan flag, decision: 404 untuk simpler).
 
  - Demo: curl PATCH+DELETE works; archived session disappears from list endpoint.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Phase 2: Auto-title + Frontend State
 
  Task 5: Auto-title pada first user message
 
  - Objective: Modifikasi app/api/chat/route.ts (atau wherever message persisted) — saat append user message, jika session.title kosong, set title =       
  firstMessage.slice(0, 40) + (length > 40 ? '…' : ''). Update juga updatedAt.
  - Implementation guidance:
    - Tambah method repo.touch(sessionId) yang update updatedAt saja (lighter than full update).
    - Auto-title hanya jalan untuk role user dan mode != 'quiz_answer' (skip quiz answer JSON).
    - Sanitize: trim whitespace, replace newlines dengan spasi.
 
  - Test requirements:
    - Send message ke session baru → title set ke first 40 chars.
    - Send 2nd message → title TIDAK berubah.
    - Send quiz answer JSON sebagai first message → title fallback ke "Sesi {date}".
 
  - Demo: Buat session, kirim "Tolong jelaskan tentang fotosintesis", check session di repo → title = "Tolong jelaskan tentang fotosintesis".
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 6: Refactor useSession hook + create useSessions hook (list)
 
  - Objective: Refactor hooks/useSession.ts baca sessionId dari query param (Next.js useSearchParams) sebagai primary source, fallback ke
  localStorage.belajar.activeSessionId. Buat hook baru hooks/useSessions.ts (plural) untuk fetch + cache list of sessions, dengan SWR-style
  stale-while-revalidate (manual implementation, no extra deps).
  - Implementation guidance:
    - useSession(sessionIdFromQuery?: string): kalau ada param, pakai itu; else fallback ke localStorage.
    - useSessions() returns { sessions, isLoading, refresh, createSession, deleteSession, renameSession }.
    - Replace single belajar.sessionId key dengan belajar.activeSessionId (sama-sama single string, tapi semantic-nya beda — ini cuma "last active untuk   
  auto-resume").
    - Migration: pada init, kalau belajar.sessionId ada (legacy), copy ke belajar.activeSessionId lalu delete legacy key.
 
  - Test requirements:
    - Hook test: useSessions returns sessions sorted by updatedAt desc.
    - createSession call → list bertambah (optimistic + refetch).
    - deleteSession → list berkurang.
 
  - Demo: React DevTools menunjukkan state yang benar saat manual create/delete via console.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Phase 3: Sidebar UI
 
  Task 7: Komponen Sidebar (presentational + isolated)
 
  - Objective: Bikin components/Sidebar.tsx murni presentational (props: sessions, activeSessionId, onSelect, onNew, onRename, onDelete, loginSlot). Group 
  sesi by relative date (Hari ini / Kemarin / 7 hari lalu / Bulan ini / Lebih lama). Inline rename via input edit-on-doubleclick. Delete via konfirmasi    
  modal kecil.
  - Implementation guidance:
    - Date grouping helper: lib/date-grouping.ts — pure function, mudah di-test.
    - Hover state untuk show ⋯ button (rename/delete).
    - Mobile: < 768px → render sebagai drawer (slide-in dari kiri), trigger via hamburger button. Pakai framer-motion (sudah ada).
    - Login slot: prop loginSlot?: ReactNode di footer. Component ini agnostic, login button-nya disuntik dari parent di Phase 5.
 
  - Test requirements:
    - Render dengan 5 sesi → muncul 5 item.
    - Click item → onSelect(sessionId) dipanggil.
    - Double-click title → input muncul, Enter → onRename(id, newTitle).
    - Date grouping: session 2 jam lalu → "Hari ini". Session 3 hari lalu → "7 hari lalu".
 
  - Demo: Render Sidebar di Storybook-equivalent (manual page) dengan mock data, semua interaksi visual jalan.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 8: Wire Sidebar ke /chat page (layout 2-pane)
 
  - Objective: Update app/chat/page.tsx jadi 2-pane layout: sidebar (kiri, w-64 desktop) + main (existing LayoutRouter). Sidebar konsumsi useSessions hook.
  Click sesi → router.push('/chat?sessionId=xxx', { scroll: false }). "+ Sesi Baru" button → call createSession → push ke session baru.
  - Implementation guidance:
    - Header existing tetap, sidebar di bawah header (atau side-by-side, decide based on UX).
    - State sync: useSession baca query param, otomatis re-hydrate saat sessionId berubah.
    - Active session highlight di sidebar.
 
  - Test requirements:
    - Manual: ada 2+ sesi → klik antar sesi → message di main pane berubah.
    - Click "Sesi Baru" → URL berubah, sidebar item baru muncul, main pane kosong.
 
  - Demo: Buat 3 sesi (3 topik berbeda), navigate antar mereka via sidebar — message history switch dengan benar.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 9: Inline rename + delete confirmation di Sidebar
 
  - Objective: Wire onRename ke useSessions.renameSession (PATCH API). Wire onDelete ke konfirmasi modal kecil → DELETE API → optimistic remove dari list. 
  Kalau active session di-delete, redirect ke session terbaru atau ke /.
  - Implementation guidance:
    - Rename: optimistic update (UI berubah duluan), revert on error.
  - Delete confirmation: modal kecil "Hapus sesi '{title}'? Tidak dapat dipulihkan." (catatan: technically soft delete, tapi user-facing kita sebut        
  "hapus").
    - Edge case: kalau user delete satu-satunya sesi → redirect ke /.
 
  - Test requirements:
    - Rename → API called dengan title baru → list updated.
    - Delete → API called → item removed dari list.
    - Delete active session → redirect.
 
  - Demo: End-to-end rename + delete via UI works.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Phase 4: Dashboard + Routing Cleanup
 
  Task 10: Dashboard di / (replace auto-redirect)
 
  - Objective: Refactor app/page.tsx — hapus auto-redirect-to-/chat behavior. Kalau useSessions().length > 0 → render <Dashboard> (grid cards of sessions +  "Sesi Baru" button + login banner). Kalau kosong → render existing OnboardingScreen.
  - Implementation guidance:
    - Component baru: components/Dashboard.tsx.
    - Card per sesi: title, profileType badge, mode terakhir, tanggal, 1-line preview dari last message (perlu listMessages tipis). Atau skip preview untuk
  Phase 1 — hanya title + date.
    - Memory stats banner (existing) tetap, tapi pindah ke section "Memori Aktif" di dashboard.
    - "Sesi Baru" button di Dashboard → trigger flow onboarding (modal pilih profil + topik), bukan auto-create.
 
  - Test requirements:
    - Visit / dengan no sessions → onboarding muncul.
    - Visit / dengan 3 sessions → dashboard muncul, 3 cards.
    - Click card → router push to /chat?sessionId=xxx.
 
  - Demo: Buat beberapa sesi, navigate / ↔ /chat, dashboard menampilkan list dengan benar.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 11: Update flow "Akhiri Sesi" + Summary
 
  - Objective: Semantik "Akhiri" diperjelas: generate summary, set endedAt, TETAPI sesi tidak hilang dari sidebar (read-only state, masih bisa dilihat).   
  Setelah summary, user di-redirect ke /summary, tombol "Selesai"/"Mulai Sesi Baru" sekarang ke dashboard /. Sesi yang sudah ended ditampilkan dengan badge
  "Selesai" di sidebar.
  - Implementation guidance:
    - Sidebar item: kalau session.endedAt ada → tampilkan badge ✓ atau border subtle.
    - Buka session yang ended → input chat di-disable, ada banner "Sesi ini sudah selesai" + button "Lihat Ringkasan".
    - "Mulai Sesi Baru" button di summary page hapus belajar.activeSessionId, push /.
 
  - Test requirements:
    - Akhiri sesi → sidebar tetap show + badge.
    - Buka ended session → input disabled.
    - "Mulai Sesi Baru" → dashboard, sesi lama masih ada di sidebar.
 
  - Demo: Akhiri sesi → masih terlihat di list, masih bisa dibuka untuk read-only review.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 12: Cleanup legacy single-session behavior
 
  - Objective: Hapus auto-redirect di app/page.tsx (sudah dilakukan di Task 10, ini cleanup full). Hapus /api/session (singular) endpoint setelah
  memastikan semua client call sudah migrated. Update onboarding flow untuk kirim ke dashboard, bukan /chat langsung.
  - Implementation guidance:
    - Grep codebase for 'belajar.sessionId' legacy key → ganti semua dengan 'belajar.activeSessionId'.
    - Hapus app/api/session/route.ts. Pastikan tidak ada referensi lain.
    - Audit useEffect di app/page.tsx dan app/chat/page.tsx — pastikan tidak ada side-effect redirect yang konflik.
 
  - Test requirements:
    - Grep test (manual): no references to old key/endpoint.
    - Existing tests masih pass.
 
  - Demo: Full app smoke-test: onboarding → dashboard → chat → akhiri → dashboard → buka chat lama. Tidak ada redirect anomali.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Phase 5: Firebase Auth (Optional Sync)
 
  Task 13: Setup Firebase Auth client + AuthContext
 
  - Objective: Install firebase package. Buat lib/firebase-client.ts initialize app dari env vars. Buat contexts/AuthContext.tsx dengan <AuthProvider>     
  (wrap di app/layout.tsx) yang expose { user, signInWithGoogle, signOut, idToken }. Buat helper lib/api-client.ts authedFetch (Authorization Bearer kalau 
  ada token, else X-Device-Id).
  - Implementation guidance:
    - Env vars baru di .env.local + .env.example: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID. Setup di
  Firebase Console (gratis).
    - signInWithGoogle: signInWithPopup(auth, new GoogleAuthProvider()).
    - Token cached + auto-refresh via Firebase SDK.
    - Pastikan authedFetch dipakai di useSessions + useChatStream — replace existing fetch calls.
 
  - Test requirements:
    - Mock test: authedFetch dengan token → header has Authorization: Bearer ....
    - Tanpa token → header has X-Device-Id: ....
 
  - Demo: UI tombol "Login dengan Google" → popup → user info terlihat di console.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 14: Firebase Admin SDK + auth middleware (server)
 
  - Objective: Install firebase-admin. Buat lib/firebase-admin.ts initialize dengan service account (atau ADC saat deploy ke Cloud Run). Implement
  lib/auth-server.ts resolveOwner(req) yang verify ID token kalau ada, else fallback ke X-Device-Id. Update semua handler di app/api/sessions/* pakai      
  middleware ini.
  - Implementation guidance:
    - firebase-admin di Cloud Run pakai default service account, di local dev pakai service-account-key.json (sudah di-gitignore).
    - Cache decoded token short-term untuk avoid re-verify per request — actually skip cache untuk simplicity, verify SDK already efficient.
    - Auth middleware throw UnauthorizedError → API return 401.
 
  - Test requirements:
    - Mock decoded token → handler returns sessions filtered by uid.
    - Invalid token → 401.
    - Tanpa token + tanpa device-id → 400.
 
  - Demo: Login di client, network tab show Authorization header → server logs show resolved userId.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 15: Login button di Sidebar + migrasi sesi
 
  - Objective: Tambah login slot di Sidebar footer (gunakan slot prop dari Task 7). Wire ke AuthContext.signInWithGoogle. Setelah login sukses, panggil    
  POST /api/sessions/migrate dengan body { deviceId: getDeviceId() }. Server: verify caller is user, find all sessions with ownerType:'device' AND
  ownerId:deviceId, update jadi ownerType:'user' AND ownerId:userId. Refresh sidebar list.
  - Implementation guidance:
    - Konfirmasi modal sebelum migrate: "Sambungkan {N} sesi anonim ke akun {email}?".
    - Migration idempotent: kalau ada session yang udah ownerType:'user', skip.
    - Sidebar footer: kalau logged in, show avatar + nama + tombol Logout. Kalau anonymous, show "Login dengan Google".
 
  - Test requirements:
    - Migrate 3 device sessions ke user → all 3 punya ownerType:'user', listByOwner('user', uid) returns 3.
    - Migrate ulang → no duplicate, no error.
    - Migration tidak merebut session deviceId orang lain (per session ownerId check).
 
  - Demo: Login → migration confirm modal → sidebar refresh → sesi-sesi anonim sebelumnya sekarang terikat akun.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 16: Multi-device sync verification + login state UI
 
  - Objective: Verifikasi end-to-end: login di Browser A buat sesi → login akun sama di Browser B → sesi muncul. Tambah indikator UI "Synced ✓" atau cloud 
  icon di sidebar saat user logged in. Logout flow: clear idToken, fetch sidebar dengan deviceId fallback (sesi anonim baru saja, sesi user-bound
  disembunyikan sampai login lagi).
  - Implementation guidance:
    - State management saat logout/login: invalidate useSessions cache, refetch.
    - Edge: kalau Browser B user belum punya deviceId, generate baru — sesi anonim Browser A tidak ke-sync (karena terikat deviceId Browser A).
    - Add toast notification "Tersinkronisasi" setelah login berhasil.
 
  - Test requirements:
    - Manual cross-browser test (atau pakai Playwright untuk Phase 7).
    - Login → list = user sessions, Logout → list = device sessions (yang ter-anonim di browser ini).
 
  - Demo: Buka di 2 browser/device berbeda, login akun yang sama, buat sesi di satu, lihat di satunya setelah refresh.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Phase 6: Polish + Edge Cases
 
  Task 17: Empty states + loading states + error boundaries
 
  - Objective: Polish UX: skeleton loader untuk sidebar list, empty state ("Belum ada sesi belajar — mulai sekarang!") dengan illustration (pakai existing 
  leaf-bg.gif atau lottie), error toast kalau API gagal, retry mechanism.
  - Implementation guidance:
    - Sidebar skeleton: 3 placeholder rows.
    - Dashboard empty state: pakai existing OnboardingScreen style.
    - Network error: toast "Gagal memuat. Coba lagi?" dengan retry button.
 
  - Test requirements:
    - Manual smoke test untuk semua state.
    - Mock API failure → error toast muncul.
 
  - Demo: Buka app dengan network throttle/offline → loading → error states tampil baik.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Task 18: Documentation + deploy checklist update
 
  - Objective: Update README.md + PROGRES.md dengan fitur multi-conversation. Update .env.example dengan Firebase env vars. Update deploy/setup-gcp.sh     
   untuk include Firebase Auth setup steps. Tulis quick guide "Cara login + sync".
  - Implementation guidance:
    - Section baru di README: "Auth & Multi-conversation".
    - Diagram simple di README (copy dari plan ini).
 
  - Test requirements: -
  - Demo: README dibaca → onboarding developer baru jelas. Deploy ke Cloud Run sukses dengan instruksi setup yang updated.
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Acceptance Criteria (Definition of Done untuk seluruh fitur)
 
  - [ ] User dapat membuat banyak sesi belajar tanpa batas (di-throttle hanya oleh Firestore quota)
  - [ ] User dapat melihat list sesi di dashboard / dan sidebar /chat
  - [ ] User dapat membuka sesi lama dengan klik (history utuh, masih bisa lanjut chat)
  - [ ] User dapat rename + delete sesi
  - [ ] Sesi yang sudah "Akhiri" jadi read-only tapi tetap visible
  - [ ] User dapat login Google → sesi anonim ter-migrate ke akun
  - [ ] User dapat akses sesi yang sama dari device berbeda setelah login
  - [ ] Logout → tampilan kembali ke mode anonymous (sesi user-bound hidden)
  - [ ] Tidak ada session leak antar user (cross-owner test pass)
  - [ ] App tetap di Firestore + Cloud Run free tier untuk skala demo (<1.000 visitor/hari)
  - [ ] Existing fitur (FlashCard FSRS review, document upload, quiz wizard) tidak regression
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Scope Out (Tidak Termasuk Fase Ini)
 
  - Real-time multi-tab sync via Firestore listeners (one-shot get cukup, hemat quota)
  - Session sharing (URL public yang bisa dibuka orang lain)
  - Folder/tag organization untuk sesi
  - Export sesi ke PDF/markdown
  - Search/filter di sidebar (kalau >50 sesi baru relevan)
  - Email/password auth (cukup Google OAuth saja)
 
  ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 
  Estimasi total: ~12-16 jam coding untuk developer yang familiar dengan codebase, terbagi ke 18 tasks. Setiap task self-contained dan demoable, sehingga  
  bisa di-pause kapan saja dan masih punya fitur kerja.