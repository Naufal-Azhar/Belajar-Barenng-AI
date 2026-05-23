const GREETING_PATTERNS = /^(h(ai|alo|elo|i)|hey|yo|p|woi|bang|kak|assalamualaikum|selamat\s*(pagi|siang|sore|malam)|good\s*(morning|afternoon|evening)|thanks?|makasih|terima\s*kasih|ok(e|ay)?|siap|bye|dadah)/i;

const ABOUT_AI_PATTERNS = /\b(kamu\s*(siapa|apa|bisa|nama)|siapa\s*(kamu|nama)|apa\s*(kamu|ini)|who\s*are\s*you|what\s*are\s*you)\b/i;

const ACADEMIC_VERBS = /\b(jelaskan|jelasin|terangkan|apa\s*(itu|yang|arti|definisi|maksud)|bagaimana|mengapa|kenapa|hitung|sebutkan|bandingkan|analisis|buatkan?\s*(soal|kuis|latihan|ringkasan)|contoh(kan|nya)?|rumus|definisi|konsep)\b/i;

/**
 * Detects if a message is non-academic (greeting, about-AI, or short casual).
 * Returns true → route to streamText (general mode).
 * Returns false → route to generateStructured (academic mode).
 */
export function isNonAcademic(message: string): boolean {
  const trimmed = message.trim();

  // If contains academic verbs, always academic
  if (ACADEMIC_VERBS.test(trimmed)) return false;

  // Greeting or about-AI patterns
  if (GREETING_PATTERNS.test(trimmed)) return true;
  if (ABOUT_AI_PATTERNS.test(trimmed)) return true;

  // Very short messages without academic intent (≤ 15 chars)
  if (trimmed.length <= 15 && !ACADEMIC_VERBS.test(trimmed)) return true;

  return false;
}
