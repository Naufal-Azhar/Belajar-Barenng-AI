// Domain types for BelajarBareng AI

export type LearningMode = 'explainer' | 'socratic' | 'quiz' | 'latihan';
export type Role = 'user' | 'ai';

// MIME types yang didukung untuk Material_File (Req 2.4, 16.3)
export type MaterialMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// Quiz Wizard state machine (Req 17)
export type QuizState =
  | 'idle'
  | 'uploading'
  | 'compiled'
  | 'configuring'
  | 'running'
  | 'completed';

export type QuizType = 'essay' | 'mcq' | 'mixed';
export type QuizCount = 3 | 5 | 10;

export interface QuizConfig {
  type: QuizType;
  count: QuizCount;
  answeredCount: number;
}

export interface DocumentContext {
  fileName: string;
  sizeBytes: number;
  mimeType: MaterialMimeType;
  /**
   * Markdown hasil Markdown_Compiler (PDF: pdf-parse, DOCX: mammoth).
   * Hanya field inilah yang masuk ke prompt AI — byte mentah PDF/DOCX
   * TIDAK PERNAH disimpan setelah compile selesai (Req 16.5).
   */
  compiledMarkdown: string;
  uploadedAt: string;
  /** Optional: warnings dari mammoth (mis. style yang tidak dikonversi) */
  compilerWarnings?: string[];
  /** GCS URI of the original uploaded file */
  gcsUri?: string;
}

/**
 * Identitas pemilik sesi.
 * - 'device': sesi anonim, ownerId = deviceId dari localStorage
 * - 'user': sesi terautentikasi, ownerId = Firebase UID
 */
export type OwnerType = 'device' | 'user';

export interface Session {
  sessionId: string;
  topic?: string;
  /** Layout_Router input — halaman /chat memilih layout berdasarkan field ini */
  currentMode: LearningMode;
  documentContext?: DocumentContext;
  /** Quiz wizard state — di-persist agar UI bisa hydrate kembali setelah reload (Req 17.2) */
  quizState?: QuizState;
  quizConfig?: QuizConfig;
  startedAt: string;
  endedAt?: string;
  summary?: SummaryPayload;

  // --- Multi-conversation fields ---
  /** Diskriminator pemilik sesi (device vs user) */
  ownerType: OwnerType;
  /** deviceId untuk anonim, atau Firebase UID untuk user terautentikasi */
  ownerId: string;
  /** Auto-generated dari first user message (40 char) atau di-rename user */
  title?: string;
  /** Soft delete penanda — sesi tidak muncul di list tapi tidak dihapus dari DB */
  isArchived?: boolean;
  /** ISO string; di-update setiap kali ada message baru, untuk sort di sidebar */
  updatedAt: string;
}

// --- Payload types (structured outputs from Gemini) ---

export type ExplainerSectionLabel = 'Inti' | 'Analogi' | 'Contoh' | 'TL;DR';

export interface ExplainerPayload {
  kind: 'explainer';
  title: string;
  sections: { label: ExplainerSectionLabel; body: string }[];
  keyTerms?: string[];
}

export interface SocraticPayload {
  kind: 'socratic';
  question: string;
  /** Tepat 3 hint: paling samar → paling spesifik (Req 5.3) */
  hints: string[];
  /** Indikator depth dialog Sokratik (Req 5.4) */
  depth?: number;
}

export interface QuizPayload {
  kind: 'quiz';
  type: 'mcq' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  /** Posisi soal pada batch — untuk progress n/total (Req 6.7) */
  index?: number;
  total?: number;
}

export interface LatihanPayload {
  kind: 'latihan';
  question: string;
  steps: { title: string; detail: string }[];
  /** Tingkat kesulitan — untuk tombol "lebih mudah / lebih sulit" (Req 7.5) */
  difficulty?: 'mudah' | 'sedang' | 'sulit';
}

export type AnyPayload =
  | ExplainerPayload
  | SocraticPayload
  | QuizPayload
  | LatihanPayload;

export interface Message {
  messageId: string;
  sessionId: string;
  role: Role;
  mode: LearningMode;
  content: string;
  createdAt: string;
  payload?: AnyPayload;
}

export interface SummaryPayload {
  topicsCovered: string[];
  keyPoints: string[];
  recommendations: string[];
  createdAt: string;
}

// --- ASRM (Adaptive Spaced Repetition Memory) types ---

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

export interface FlashCard {
  cardId: string;
  deviceId: string;
  sessionId: string;
  question: string;
  answer: string;
  concept: string;
  state: CardState;
  due: string; // ISO date
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  weakStreak: number;
  lastReview?: string; // ISO date
  createdAt: string;
}

export interface ReviewLog {
  cardId: string;
  rating: ReviewRating;
  grade: number; // 0-4
  feedback: string;
  reviewedAt: string;
}

export interface ExtractedCard {
  question: string;
  answer: string;
  concept: string;
}
