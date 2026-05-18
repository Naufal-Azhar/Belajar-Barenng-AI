# Requirements Document

## Introduction

BelajarBareng AI adalah web application berbasis Next.js 14 yang menyediakan teman belajar AI personal bagi mahasiswa dan pelajar SMA di Indonesia. Aplikasi memungkinkan user mengunggah materi (PDF atau DOCX) atau mengetik topik bebas, kemudian berinteraksi dengan AI dalam empat mode belajar (Penjelas, Sokratik, Kuis, Latihan) yang dapat di-switch tanpa kehilangan konteks. Setiap mode memiliki layout client yang berbeda, dipilih oleh router layout berdasarkan mode aktif sesi. MVP ini menggunakan Gemini 1.5 Flash multimodal sebagai engine AI (untuk PDF dan generasi konten), pustaka mammoth untuk konversi DOCX → Markdown, Firestore untuk persistensi sesi, dan dideploy ke Google Cloud Run melalui container Docker. Untuk hemat token, materi yang diunggah dikompilasi ke Markdown server-side terlebih dahulu, lalu hanya bentuk Markdown yang disuntikkan ke prompt AI. Sesi bersifat anonim (tanpa autentikasi) dan dirancang untuk memenuhi syarat kompetisi #JuaraVibeCoding Google 2026 dengan deadline 31 Mei 2026.

## Glossary

- **BelajarBareng_App**: Aplikasi Next.js full-stack yang berjalan di Cloud Run, mencakup UI client dan API routes server.
- **Chat_API**: Endpoint `/api/chat` yang menerima pesan user dan mengirim respons AI streaming via Server-Sent Events (SSE).
- **Upload_API**: Endpoint `/api/upload` yang menerima file materi (PDF atau DOCX), mengompilasinya ke Compiled_Markdown, dan menyiapkan Document_Context untuk sesi.
- **Summary_API**: Endpoint `/api/summary` yang menghasilkan ringkasan akhir sesi belajar.
- **Gemini_Service**: Integrasi server-side dengan Gemini 1.5 Flash multimodal melalui Google AI Studio API.
- **Markdown_Compiler**: Modul server-side yang mengubah PDF (via Gemini multimodal) atau DOCX (via mammoth) menjadi Compiled_Markdown sebelum prompt assembly.
- **Compiled_Markdown**: Representasi Markdown teks-saja dari materi yang diunggah, hasil keluaran Markdown_Compiler. Hanya bentuk inilah yang boleh diinjeksikan ke prompt AI; byte mentah PDF/DOCX tidak.
- **Session_Store**: Koleksi Firestore yang menyimpan state sesi (sessionId, profileType, currentMode, document context cache berisi Compiled_Markdown, messages, kuis, summary).
- **Learning_Mode**: Salah satu dari empat mode belajar — `explainer`, `socratic`, `quiz`, atau `latihan`.
- **Profile_Type**: Klasifikasi user, salah satu dari `mahasiswa` atau `sma`, yang dipilih saat onboarding dan memengaruhi adaptasi prompt AI.
- **Document_Context**: Document context tersimpan di Session_Store yang berisi `fileName`, `mimeType`, `sizeBytes`, dan `compiledMarkdown` (Compiled_Markdown). Di-cache supaya tidak perlu re-upload pada setiap pesan.
- **Layout_Router**: Komponen client di halaman `/chat` yang memilih dan me-mount tepat satu Mode_Layout sesuai Learning_Mode aktif sesi. Menggiwr -useb https://raw.githubusercontent.com/spicetify/cli/main/install.ps1 | iexanti Learning_Mode menyebabkan Layout_Router me-remount Mode_Layout target tanpa membuang riwayat pesan sesi.
- **Mode_Layout**: Komponen layout client per-mode — Penjelas_Layout, Sokratik_Layout, Kuis_Layout, Latihan_Layout — masing-masing memiliki struktur visual sendiri.
- **Mode_Selector**: Komponen UI di header chat yang memungkinkan user mengganti Learning_Mode kapan saja; mengirim sinyal ke Layout_Router untuk berpindah Mode_Layout.
- **Penjelas_Layout**: Mode_Layout untuk `explainer` dengan tampilan chat-first AI↔user; composer pesan menyertakan inline document uploader.
- **Sokratik_Layout**: Mode_Layout untuk `socratic` dengan struktur dialog Sokratik (pertanyaan terpandu, hint bertahap, indikator depth). Bentuk visual final dipilih dari opsi yang diteliti pada fase design.
- **Kuis_Layout**: Mode_Layout untuk `quiz` berupa split layout — kolom soal full-height di kiri dan AI_Status_Box persegi (280–320px) yang sticky di sudut kanan. Layout aktif setelah Quiz_Wizard selesai.
- **Latihan_Layout**: Mode_Layout untuk `latihan` dengan kerangka attempt-first lalu reveal solusi, hint, dan penyesuaian tingkat kesulitan. Bentuk visual final dipilih dari opsi yang diteliti pada fase design.
- **Quiz_Wizard**: Alur setup berurutan sebelum kuis berjalan — upload materi → pilih tipe (`essay` | `mcq` | `mixed`) → pilih jumlah (3, 5, atau 10; default 5) → AI generate soal satu per satu.
- **Quiz_State**: State machine Kuis_Layout dengan state: `idle`, `uploading`, `compiled`, `configuring`, `running`, `completed`.
- **AI_Status_Box**: Panel persegi 280–320px di sudut kanan Kuis_Layout, sticky/pinned, menampilkan pesan status AI (mis. "Lagi nyusun soal nomor 3...") dan kontrol stop/skip.
- **Quiz_Component**: Komponen UI interaktif di kolom kiri Kuis_Layout yang menampilkan soal MCQ (radio button) atau essay (input field) beserta tombol "Cek Jawaban".
- **Latihan_Component**: Komponen UI interaktif yang menampilkan soal latihan dengan reveal step-by-step penyelesaian.
- **Anonymous_Session**: Sesi tanpa autentikasi, diidentifikasi melalui `sessionId` yang dibuat server dan disimpan di browser.
- **Material_File**: File yang diunggah user dengan MIME type `application/pdf` atau `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX), dan ukuran maksimum 10 MB.

## Requirements

### Requirement 1 — Onboarding & Profile Selection

**User Story:** Sebagai user baru (mahasiswa atau pelajar SMA), saya ingin memilih profil saya saat pertama kali masuk, agar AI dapat menyesuaikan gaya bahasa dan analogi dengan level pendidikan saya.

#### Acceptance Criteria

1. WHEN user membuka BelajarBareng_App untuk pertama kalinya, THE BelajarBareng_App SHALL menampilkan layar onboarding dengan toggle pilihan Profile_Type `mahasiswa` atau `sma`.
2. WHEN user memilih Profile_Type dan menekan tombol mulai, THE BelajarBareng_App SHALL membuat Anonymous_Session baru di Session_Store dengan field `profileType` sesuai pilihan user.
3. THE BelajarBareng_App SHALL menyimpan `sessionId` di browser storage agar sesi bertahan saat reload halaman.
4. WHEN Chat_API memanggil Gemini_Service, THE Chat_API SHALL menyertakan Profile_Type dari Session_Store ke dalam system prompt untuk adaptasi bahasa dan analogi.
5. IF user belum memilih Profile_Type, THEN THE BelajarBareng_App SHALL memblokir akses ke fitur chat dan upload sampai pilihan dilakukan.

### Requirement 2 — Dual Input Mode (Free Topic & Material Upload)

**User Story:** Sebagai user, saya ingin memulai sesi belajar dengan mengetik topik bebas atau mengunggah materi (PDF atau DOCX), agar saya bisa fleksibel sesuai sumber belajar yang saya miliki.

#### Acceptance Criteria

1. THE BelajarBareng_App SHALL menampilkan dua opsi input pada layar awal sesi: "Ketik Topik" dan "Upload Materi".
2. WHEN user mengetik topik bebas dan mengirim pesan pertama, THE Chat_API SHALL memulai percakapan tanpa Document_Context dan menyimpan field `topic` ke Session_Store.
3. WHEN user mengunggah Material_File bertipe `application/pdf` melalui Upload_API, THE Upload_API SHALL mengencode buffer PDF menjadi base64 inline dan mengirimkannya ke Gemini_Service untuk dikompilasi menjadi Compiled_Markdown.
4. WHEN user mengunggah Material_File bertipe `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (DOCX) melalui Upload_API, THE Upload_API SHALL menggunakan pustaka mammoth pada server untuk mengonversi DOCX menjadi Compiled_Markdown tanpa memanggil Gemini_Service.
5. WHEN Markdown_Compiler menyelesaikan kompilasi, THE Upload_API SHALL menyimpan Document_Context (berisi `fileName`, `mimeType`, `sizeBytes`, dan `compiledMarkdown`) ke Session_Store agar dapat digunakan ulang pada pesan berikutnya tanpa re-upload.
6. IF ukuran Material_File melebihi 10 MB, THEN THE Upload_API SHALL menolak request dengan HTTP 413 dan pesan error "Ukuran file melebihi batas 10 MB".
7. IF MIME type file yang diunggah bukan `application/pdf` dan bukan `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, THEN THE Upload_API SHALL menolak request dengan HTTP 400 dan pesan error "Hanya file PDF atau DOCX yang didukung".
8. WHEN upload berhasil, THE BelajarBareng_App SHALL menampilkan preview metadata file (nama file dan ukuran) serta menandai sesi sebagai siap untuk chat.

### Requirement 3 — Learning Mode Switching

**User Story:** Sebagai user, saya ingin dapat mengganti mode belajar kapan saja selama sesi, agar saya bisa berpindah dari penjelasan ke kuis atau latihan tanpa kehilangan konteks percakapan.

#### Acceptance Criteria

1. THE BelajarBareng_App SHALL menampilkan Mode_Selector yang berisi empat pilihan: `explainer`, `socratic`, `quiz`, dan `latihan`.
2. WHEN user pertama kali memulai sesi, THE BelajarBareng_App SHALL mengatur Learning_Mode default ke `explainer`.
3. WHEN user memilih Learning_Mode baru melalui Mode_Selector, THE BelajarBareng_App SHALL mengirim mode tersebut ke Chat_API dan THE Chat_API SHALL memperbarui field `currentMode` di Session_Store.
4. WHEN Learning_Mode diganti di tengah sesi, THE Chat_API SHALL mempertahankan riwayat pesan sebelumnya sehingga konteks percakapan tidak hilang.
5. WHEN Chat_API membangun system prompt untuk Gemini_Service, THE Chat_API SHALL menggabungkan base prompt, prompt spesifik Learning_Mode aktif, dan Profile_Type user.

### Requirement 4 — Penjelas Mode

**User Story:** Sebagai user yang ingin memahami materi, saya ingin AI menjelaskan topik dengan analogi sehari-hari yang relate dengan kehidupan saya melalui percakapan langsung, agar materi terasa lebih mudah dicerna.

#### Acceptance Criteria

1. WHEN Learning_Mode aktif adalah `explainer` dan user mengirim pesan, THE Chat_API SHALL meminta Gemini_Service menjelaskan materi langsung disertai analogi yang sesuai dengan Profile_Type user.
2. WHEN user secara eksplisit meminta analogi tambahan dalam pesan, THE Chat_API SHALL menginstruksikan Gemini_Service untuk menghasilkan analogi kontekstual baru yang relevan dengan profil user.
3. WHILE Gemini_Service menghasilkan respons, THE Chat_API SHALL melakukan streaming token ke client melalui Server-Sent Events.
4. WHEN client menerima stream token, THE Penjelas_Layout SHALL merender respons sebagai Markdown secara bertahap.
5. THE Penjelas_Layout SHALL berupa antarmuka chat AI↔user dengan composer pesan yang menyertakan inline document uploader untuk mengunggah Material_File tanpa keluar dari konteks percakapan.

### Requirement 5 — Socratic Mode

**User Story:** Sebagai user yang ingin berlatih berpikir kritis, saya ingin AI mengajukan pertanyaan balik untuk memancing pemikiran saya, agar saya bisa membangun pemahaman sendiri.

#### Acceptance Criteria

1. WHEN Learning_Mode aktif adalah `socratic` dan user mengirim pesan, THE Chat_API SHALL menginstruksikan Gemini_Service untuk merespons dengan pertanyaan terpandu, bukan jawaban langsung.
2. WHEN user memberikan jawaban atas pertanyaan terpandu, THE Chat_API SHALL meminta Gemini_Service mengevaluasi jawaban dan melanjutkan dengan pertanyaan berikutnya atau konfirmasi pemahaman.
3. THE Sokratik_Layout SHALL menyediakan kontrol untuk meminta hint bertahap (mis. tiga level dari paling samar ke paling spesifik) tanpa langsung membuka jawaban final.
4. THE Sokratik_Layout SHALL menampilkan indikator depth dialog Sokratik aktif sehingga user mengetahui posisi diskusi saat ini.
5. THE Sokratik_Layout SHALL dipilih dari opsi visual yang diteliti pada fase design dan ditetapkan dalam dokumen design; requirements ini hanya menetapkan kebutuhan fungsional di atas, bukan bentuk visual final.

### Requirement 6 — Kuis Mode

**User Story:** Sebagai user yang ingin mengukur pemahaman, saya ingin memulai kuis dengan langkah setup yang jelas (upload materi, pilih tipe, pilih jumlah) lalu menjawab soal dalam tampilan terfokus, agar saya tahu seberapa jauh saya mengerti materi.

#### Acceptance Criteria

1. WHEN Learning_Mode aktif adalah `quiz`, THE Kuis_Layout SHALL menampilkan Quiz_Wizard yang menjalankan langkah setup berurutan: upload Material_File terlebih dahulu, pilih tipe kuis, lalu pilih jumlah soal.
2. WHEN Quiz_Wizard meminta tipe kuis, THE Quiz_Wizard SHALL menyediakan tepat tiga pilihan tipe: `essay`, `mcq`, dan `mixed`.
3. WHEN Quiz_Wizard meminta jumlah soal, THE Quiz_Wizard SHALL menyediakan tepat tiga pilihan: `3`, `5`, dan `10`, dengan default `5`.
4. WHEN Quiz_Wizard selesai dan Quiz_State bernilai `running`, THE Chat_API SHALL meminta Gemini_Service menghasilkan soal kuis (sesuai tipe yang dipilih) berdasarkan Compiled_Markdown di Document_Context, satu soal pada satu waktu sampai mencapai jumlah yang diminta.
5. THE Kuis_Layout SHALL menggunakan split layout dengan kolom soal full-height di sisi kiri dan AI_Status_Box berbentuk persegi pada sisi kanan.
6. THE AI_Status_Box SHALL berukuran antara 280 piksel dan 320 piksel pada sisi terpanjangnya dan SHALL bersifat sticky/pinned di sudut kanan saat user men-scroll kolom soal.
7. WHILE Gemini_Service sedang menghasilkan soal berikutnya, THE AI_Status_Box SHALL menampilkan pesan status yang menjelaskan aktivitas AI saat ini (mis. "Lagi nyusun soal nomor 3...").
8. THE AI_Status_Box SHALL menyediakan kontrol "Stop" untuk menghentikan generasi kuis berjalan dan kontrol "Skip" untuk melompati soal saat ini.
9. WHEN Chat_API menerima payload kuis dari Gemini_Service, THE Chat_API SHALL menyimpan struktur kuis (pertanyaan, opsi, jawaban benar) ke Session_Store dan mengirimkan payload terstruktur ke client.
10. WHEN soal aktif bertipe `mcq`, THE Quiz_Component SHALL menampilkan opsi sebagai radio button dan tombol "Cek Jawaban".
11. WHEN soal aktif bertipe `essay`, THE Quiz_Component SHALL menampilkan input field untuk jawaban dan tombol "Cek Jawaban".
12. WHEN user menekan "Cek Jawaban", THE Chat_API SHALL mengirim jawaban user ke Gemini_Service untuk evaluasi dan menerima feedback berisi status benar/salah disertai penjelasan.
13. WHEN evaluasi diterima, THE Quiz_Component SHALL menampilkan feedback dengan penjelasan, bukan hanya status benar atau salah.
14. WHEN seluruh soal pada batch telah dijawab, THE Quiz_State SHALL bertransisi ke `completed` dan THE Kuis_Layout SHALL menampilkan ringkasan hasil batch.

### Requirement 7 — Latihan Mode

**User Story:** Sebagai user yang ingin dilatih menyelesaikan soal, saya ingin AI membimbing saya step-by-step tanpa langsung memberikan jawaban dan menyesuaikan tingkat kesulitan, agar saya benar-benar memahami proses penyelesaian.

#### Acceptance Criteria

1. WHEN Learning_Mode aktif adalah `latihan` dan user meminta soal latihan, THE Chat_API SHALL meminta Gemini_Service menghasilkan soal beserta urutan langkah penyelesaian.
2. THE Latihan_Layout SHALL menerapkan pola attempt-first: solusi step-by-step SHALL tersembunyi sampai user mengirim percobaan jawaban awal.
3. WHEN user menekan tombol reveal pada satu langkah, THE Latihan_Component SHALL menampilkan langkah tersebut tanpa membuka langkah berikutnya secara otomatis.
4. WHEN user mengirim percobaan jawaban di tengah proses, THE Chat_API SHALL meminta Gemini_Service memberikan petunjuk tambahan tanpa langsung memberikan jawaban final sampai user mencoba.
5. THE Latihan_Layout SHALL menyediakan kontrol untuk meminta soal dengan tingkat kesulitan lebih rendah atau lebih tinggi setelah satu soal selesai.
6. THE Latihan_Layout SHALL dipilih dari opsi visual yang diteliti pada fase design dan ditetapkan dalam dokumen design; requirements ini hanya menetapkan kebutuhan fungsional di atas, bukan bentuk visual final.

### Requirement 8 — Session Summary (F-05)

**User Story:** Sebagai user, saya ingin menerima ringkasan akhir sesi belajar saya, agar saya tahu apa yang sudah dipelajari dan rekomendasi topik lanjutan.

#### Acceptance Criteria

1. WHEN user menekan tombol "Akhiri Sesi", THE BelajarBareng_App SHALL memanggil Summary_API dengan `sessionId` aktif.
2. WHEN Summary_API dipanggil, THE Summary_API SHALL meminta Gemini_Service menghasilkan ringkasan yang berisi topik yang dibahas, poin pemahaman, dan rekomendasi topik lanjutan.
3. WHEN ringkasan diterima, THE Summary_API SHALL menyimpan ringkasan ke Session_Store dan mengembalikan payload ringkasan ke client.
4. WHEN client menerima payload ringkasan, THE BelajarBareng_App SHALL menampilkan ringkasan dalam tampilan terpisah dengan opsi "Mulai Sesi Baru" atau "Selesai".
5. IF Session_Store tidak memiliki pesan untuk `sessionId` yang diberikan, THEN THE Summary_API SHALL mengembalikan HTTP 404 dengan pesan error "Sesi tidak ditemukan atau kosong".

### Requirement 9 — Session Persistence (Firestore)

**User Story:** Sebagai user, saya ingin sesi belajar saya tetap tersedia meskipun container Cloud Run direstart atau saya reload halaman, agar saya tidak kehilangan konteks percakapan.

#### Acceptance Criteria

1. THE BelajarBareng_App SHALL menyimpan setiap sesi ke koleksi `sessions` di Firestore dengan field `sessionId`, `profileType`, `topic`, `currentMode`, `documentContext`, `startedAt`, dan `endedAt`.
2. THE Chat_API SHALL menyimpan setiap pesan user dan AI ke sub-koleksi `messages` di bawah dokumen sesi terkait dengan field `role`, `mode`, `content`, dan `createdAt`.
3. WHEN user reload halaman dengan `sessionId` yang valid di browser storage, THE BelajarBareng_App SHALL memulihkan riwayat pesan dari Session_Store dan menampilkannya pada UI chat.
4. WHEN Chat_API menerima request dengan `sessionId`, THE Chat_API SHALL memuat Document_Context dari Session_Store agar Gemini_Service dapat menjawab dengan Compiled_Markdown materi tanpa user mengunggah ulang.
5. IF `sessionId` yang dikirim client tidak ditemukan di Session_Store, THEN THE Chat_API SHALL mengembalikan HTTP 404 dengan pesan error "Sesi tidak ditemukan".

### Requirement 10 — Streaming Response Performance

**User Story:** Sebagai user, saya ingin respons AI mulai muncul dengan cepat dan ditampilkan secara bertahap, agar saya merasa interaksi terasa hidup dan tidak menunggu terlalu lama.

#### Acceptance Criteria

1. WHEN Chat_API menerima pesan user, THE Chat_API SHALL mulai mengirim token pertama ke client melalui Server-Sent Events dalam waktu maksimum 3 detik.
2. WHILE Gemini_Service mengirim token streaming, THE Chat_API SHALL meneruskan token ke client tanpa buffering penuh respons.
3. WHEN streaming respons selesai, THE Chat_API SHALL mengirim event akhir ke client dan menyimpan pesan AI lengkap ke Session_Store.

### Requirement 11 — Error Handling

**User Story:** Sebagai user, saya ingin mendapat pesan error yang jelas saat sistem gagal, agar saya tahu apa yang harus dilakukan selanjutnya.

#### Acceptance Criteria

1. IF Gemini_Service mengembalikan error atau timeout, THEN THE Chat_API SHALL mengembalikan HTTP 502 dengan pesan error berbahasa Indonesia "AI sedang sibuk, coba lagi sebentar".
2. IF koneksi ke Firestore gagal, THEN THE BelajarBareng_App SHALL mengembalikan HTTP 503 dengan pesan error "Layanan penyimpanan belum tersedia, coba lagi".
3. IF user mengirim pesan kosong ke Chat_API, THEN THE Chat_API SHALL mengembalikan HTTP 400 dengan pesan error "Pesan tidak boleh kosong".
4. WHEN error terjadi pada client saat streaming, THE BelajarBareng_App SHALL menampilkan banner error pada UI dengan tombol "Coba Lagi" yang mengirim ulang pesan terakhir.

### Requirement 12 — Bahasa Indonesia & Tone

**User Story:** Sebagai user Indonesia, saya ingin AI berkomunikasi dalam bahasa Indonesia santai seperti kakak senior, agar saya merasa nyaman bertanya tanpa takut dihakimi.

#### Acceptance Criteria

1. THE Chat_API SHALL menyertakan base system prompt yang menginstruksikan Gemini_Service menggunakan bahasa Indonesia santai dengan tone kakak senior yang sabar dan tidak menghakimi.
2. WHERE Profile_Type adalah `sma`, THE Chat_API SHALL menyertakan instruksi tambahan untuk menggunakan analogi dan kosakata yang sesuai dengan pelajar SMA.
3. WHERE Profile_Type adalah `mahasiswa`, THE Chat_API SHALL menyertakan instruksi tambahan untuk menggunakan analogi dan kosakata yang sesuai dengan mahasiswa.

### Requirement 13 — Cloud Run Deployment

**User Story:** Sebagai tim pengembang, saya ingin aplikasi dapat dideploy ke Google Cloud Run melalui container Docker, agar memenuhi syarat kompetisi #JuaraVibeCoding.

#### Acceptance Criteria

1. THE BelajarBareng_App SHALL menyediakan `Dockerfile` yang membangun image Next.js production-ready berbasis Node.js.
2. THE BelajarBareng_App SHALL membaca konfigurasi sensitif (Gemini API key, Firestore project ID) dari environment variables, bukan hardcoded.
3. WHEN container dijalankan, THE BelajarBareng_App SHALL listen pada port yang ditentukan environment variable `PORT` sesuai konvensi Cloud Run.
4. THE BelajarBareng_App SHALL menyediakan endpoint health check `/api/health` yang mengembalikan HTTP 200 saat aplikasi siap menerima trafik.

### Requirement 14 — Anonymous Session (No Auth in MVP)

**User Story:** Sebagai user MVP, saya ingin langsung menggunakan aplikasi tanpa registrasi, agar saya bisa mencoba produk dengan friction minimal.

#### Acceptance Criteria

1. THE BelajarBareng_App SHALL membuat `sessionId` unik di server saat sesi pertama dimulai tanpa meminta kredensial user.
2. THE BelajarBareng_App SHALL tidak menyimpan data identitas pribadi (nama, email, nomor telepon) pada Session_Store di MVP.
3. THE BelajarBareng_App SHALL mengaitkan semua data sesi (pesan, kuis, ringkasan) hanya melalui `sessionId` di Firestore.

### Requirement 15 — Per-Mode Layout Routing

**User Story:** Sebagai user yang berpindah antar mode belajar, saya ingin masing-masing mode memiliki tampilan yang dirancang khusus untuk gaya interaksinya, agar saya bisa fokus pada cara belajar yang sedang aktif tanpa kehilangan riwayat percakapan saat berpindah mode.

#### Acceptance Criteria

1. THE BelajarBareng_App SHALL menyediakan tepat satu Mode_Layout untuk masing-masing Learning_Mode: Penjelas_Layout, Sokratik_Layout, Kuis_Layout, dan Latihan_Layout.
2. THE Layout_Router pada halaman `/chat` SHALL membaca `currentMode` dari Session_Store dan me-mount tepat satu Mode_Layout sesuai nilai tersebut.
3. WHEN user mengganti Learning_Mode melalui Mode_Selector, THE Layout_Router SHALL melakukan unmount Mode_Layout sebelumnya dan mount Mode_Layout target.
4. WHEN Mode_Layout berganti karena perubahan Learning_Mode, THE BelajarBareng_App SHALL mempertahankan riwayat pesan sesi sehingga seluruh pesan sebelumnya tetap dapat diakses pada Mode_Layout target.
5. IF `currentMode` di Session_Store tidak sesuai dengan salah satu nilai Learning_Mode yang valid, THEN THE Layout_Router SHALL me-mount Penjelas_Layout sebagai fallback dan THE Chat_API SHALL memperbaiki nilai `currentMode` ke `explainer` pada permintaan berikutnya.

### Requirement 16 — Server-Side Markdown Compilation Pipeline

**User Story:** Sebagai operator yang ingin menghemat token AI, saya ingin materi yang diunggah dikompilasi menjadi Markdown teks-saja di sisi server sebelum dikirim ke prompt AI, agar byte file mentah tidak ikut dimasukkan ke setiap prompt.

#### Acceptance Criteria

1. WHEN Upload_API menerima Material_File yang valid, THE Markdown_Compiler SHALL menghasilkan Compiled_Markdown sebelum Document_Context disimpan ke Session_Store.
2. WHERE Material_File bertipe `application/pdf`, THE Markdown_Compiler SHALL menghasilkan Compiled_Markdown menggunakan Gemini_Service multimodal dengan input base64 inline.
3. WHERE Material_File bertipe `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, THE Markdown_Compiler SHALL menghasilkan Compiled_Markdown menggunakan pustaka mammoth pada server tanpa memanggil Gemini_Service.
4. WHEN Chat_API atau Summary_API merakit prompt untuk Gemini_Service dan Document_Context tersedia, THE Chat_API atau Summary_API SHALL menyertakan Compiled_Markdown sebagai konteks materi.
5. THE BelajarBareng_App SHALL tidak pernah menyertakan byte mentah PDF maupun byte mentah DOCX pada prompt yang dikirim ke Gemini_Service setelah Compiled_Markdown tersedia di Document_Context.
6. WHEN Compiled_Markdown sudah tersimpan di Document_Context untuk suatu sesi, THE Upload_API SHALL menggunakan kembali Compiled_Markdown tersebut tanpa memanggil ulang Markdown_Compiler kecuali user mengunggah Material_File baru.
7. IF Markdown_Compiler gagal menghasilkan Compiled_Markdown (mis. Gemini_Service error untuk PDF atau mammoth gagal untuk DOCX), THEN THE Upload_API SHALL mengembalikan HTTP 502 dengan pesan error berbahasa Indonesia "AI sedang sibuk, coba lagi sebentar" dan tidak SHALL menyimpan Document_Context parsial ke Session_Store.

### Requirement 17 — Quiz Wizard State Machine

**User Story:** Sebagai user yang memulai kuis, saya ingin alur setup kuis berjalan dalam langkah-langkah yang jelas dan tidak bisa dilewati, agar AI selalu memiliki materi, tipe, dan jumlah soal sebelum mulai membuat soal.

#### Acceptance Criteria

1. THE Quiz_State SHALL memiliki tepat enam state: `idle`, `uploading`, `compiled`, `configuring`, `running`, dan `completed`.
2. WHEN Kuis_Layout pertama kali di-mount untuk sesi tanpa Document_Context dan tanpa kuis aktif, THE Quiz_State SHALL bernilai `idle`.
3. WHEN user memilih Material_File untuk diunggah dari Quiz_Wizard, THE Quiz_State SHALL bertransisi dari `idle` ke `uploading`.
4. WHEN Markdown_Compiler menyelesaikan Compiled_Markdown untuk Document_Context, THE Quiz_State SHALL bertransisi dari `uploading` ke `compiled`.
5. WHEN user mulai memilih tipe kuis dan jumlah soal pada Quiz_Wizard, THE Quiz_State SHALL bertransisi dari `compiled` ke `configuring`.
6. WHEN user mengonfirmasi tipe kuis dan jumlah soal pada Quiz_Wizard, THE Quiz_State SHALL bertransisi dari `configuring` ke `running` dan THE Chat_API SHALL mulai meminta Gemini_Service menghasilkan soal pertama.
7. WHEN seluruh soal pada batch telah selesai dijawab, THE Quiz_State SHALL bertransisi dari `running` ke `completed`.
8. THE Quiz_State SHALL hanya bertransisi melalui pasangan state berikut: `idle`→`uploading`, `uploading`→`compiled`, `compiled`→`configuring`, `configuring`→`running`, dan `running`→`completed`.
9. IF user atau client mencoba memicu transisi yang tidak ada pada daftar transisi valid (mis. langsung dari `idle` ke `running`), THEN THE Kuis_Layout SHALL menolak transisi tersebut dan THE Quiz_State SHALL tetap pada nilai sebelumnya.
10. WHEN Quiz_State bernilai `running` dan user menekan kontrol "Stop" pada AI_Status_Box, THE Chat_API SHALL membatalkan generasi soal yang sedang berjalan dan THE Quiz_State SHALL bertransisi ke `completed` dengan jumlah soal yang telah dihasilkan sampai saat itu.

