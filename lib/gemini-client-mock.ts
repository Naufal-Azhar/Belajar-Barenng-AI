import type { GeminiClientInterface } from './gemini-client';

/**
 * Mock Gemini client — returns dummy data so the app can be previewed
 * without a real API key. Activate with USE_MOCK_AI=true in .env.local
 */
export class MockGeminiClient implements GeminiClientInterface {
  async *streamText(args: { systemPrompt: string; history: any[]; userMessage: string }): AsyncIterable<string> {
    // Simulate streaming delay
    const response = this.generateMockResponse(args.systemPrompt, args.userMessage);
    const words = response.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  async extractFromPdf(): Promise<string> {
    return '# Materi Dummy\n\nIni adalah hasil ekstraksi PDF dummy untuk testing.\n\n## Konsep Utama\n- Fotosintesis mengubah CO2 dan H2O menjadi glukosa\n- Respirasi sel menghasilkan ATP\n- Mitokondria adalah powerhouse of the cell';
  }

  async generateStructured<T>(args: { systemPrompt: string; history: any[]; userMessage: string; schema: object }): Promise<T> {
    const prompt = args.systemPrompt.toLowerCase();

    // Extraction endpoint
    if (prompt.includes('ekstrak') || prompt.includes('flashcard')) {
      return {
        cards: [
          { question: 'Apa fungsi mitokondria dalam sel?', answer: 'Mitokondria berfungsi sebagai pembangkit energi (ATP) melalui respirasi seluler', concept: 'mitokondria' },
          { question: 'Apa hasil akhir fotosintesis?', answer: 'Glukosa (C6H12O6) dan oksigen (O2)', concept: 'fotosintesis' },
          { question: 'Di mana fotosintesis terjadi?', answer: 'Di kloroplas, tepatnya pada membran tilakoid dan stroma', concept: 'kloroplas' },
        ],
      } as T;
    }

    // Review/grading endpoint
    if (prompt.includes('nilai') || prompt.includes('grade')) {
      const userMsg = args.userMessage.toLowerCase();
      const isCorrect = userMsg.length > 20; // simple heuristic: longer answer = better
      return {
        grade: isCorrect ? 3 : 1,
        feedback: isCorrect
          ? 'Bagus! Jawabanmu sudah mencakup poin utama. Coba tambahkan detail tentang prosesnya.'
          : 'Belum tepat nih. Coba ingat-ingat lagi konsep dasarnya ya!',
        rephrasedQuestion: 'Jelaskan dengan kata-katamu sendiri, bagaimana proses ini bekerja?',
      } as T;
    }

    // Explainer mode
    if (prompt.includes('explainer') || prompt.includes('jelaskan')) {
      return {
        kind: 'explainer',
        title: 'Penjelasan Konsep',
        sections: [
          { label: 'Inti', body: 'Ini adalah penjelasan inti dari konsep yang kamu tanyakan. Dalam konteks biologi, setiap sel memiliki organel dengan fungsi spesifik.' },
          { label: 'Analogi', body: 'Bayangkan sel seperti sebuah kota kecil. Mitokondria adalah pembangkit listriknya, nukleus adalah balai kotanya.' },
          { label: 'TL;DR', body: 'Setiap organel punya tugas masing-masing untuk menjaga sel tetap hidup dan berfungsi.' },
        ],
        keyTerms: ['organel', 'mitokondria', 'nukleus', 'membran sel'],
      } as T;
    }

    // Socratic mode
    if (prompt.includes('socratic') || prompt.includes('pertanyaan')) {
      return {
        kind: 'socratic',
        question: 'Menurutmu, kenapa sel membutuhkan energi? Apa yang terjadi kalau sel kehabisan ATP?',
        hints: [
          'Coba pikirkan aktivitas apa saja yang dilakukan sel sehari-hari...',
          'Sel perlu energi untuk transport zat, membelah, dan menjaga bentuknya',
          'Tanpa ATP, pompa ion berhenti dan sel akan mengalami lisis',
        ],
        depth: 2,
      } as T;
    }

    // Quiz mode
    if (prompt.includes('quiz') || prompt.includes('soal')) {
      return {
        kind: 'quiz',
        type: 'mcq',
        question: 'Organel sel yang berperan dalam respirasi seluler adalah...',
        options: ['Ribosom', 'Mitokondria', 'Lisosom', 'Badan Golgi'],
        correctAnswer: 'Mitokondria',
        explanation: 'Mitokondria adalah tempat berlangsungnya respirasi seluler yang menghasilkan ATP sebagai sumber energi utama sel.',
      } as T;
    }

    // Latihan mode
    if (prompt.includes('latihan') || prompt.includes('step')) {
      return {
        kind: 'latihan',
        question: 'Hitung jumlah ATP yang dihasilkan dari 1 molekul glukosa melalui respirasi aerob lengkap.',
        steps: [
          { title: 'Glikolisis', detail: 'Menghasilkan 2 ATP net dan 2 NADH' },
          { title: 'Dekarboksilasi Oksidatif', detail: 'Menghasilkan 2 NADH dan 2 CO2' },
          { title: 'Siklus Krebs', detail: 'Menghasilkan 2 ATP, 6 NADH, 2 FADH2' },
          { title: 'Rantai Transpor Elektron', detail: 'NADH → 2.5 ATP, FADH2 → 1.5 ATP' },
        ],
      } as T;
    }

    // Summary
    if (prompt.includes('ringkas') || prompt.includes('summary')) {
      return {
        topicsCovered: ['Respirasi Seluler', 'Fotosintesis', 'Organel Sel'],
        keyPoints: ['Mitokondria menghasilkan ATP', 'Fotosintesis terjadi di kloroplas', 'ATP adalah mata uang energi sel'],
        recommendations: ['Pelajari lebih dalam tentang rantai transpor elektron', 'Coba bandingkan respirasi aerob vs anaerob'],
        createdAt: new Date().toISOString(),
      } as T;
    }

    // Fallback
    return { kind: 'explainer', title: 'Mock Response', sections: [{ label: 'Inti', body: 'Ini adalah respons dummy.' }] } as T;
  }

  private generateMockResponse(systemPrompt: string, userMessage: string): string {
    return `Ini adalah respons dummy dari AI. Kamu bertanya tentang "${userMessage.slice(0, 50)}". Dalam mode testing, semua respons menggunakan data palsu. Untuk respons real, masukkan GEMINI_API_KEY di .env.local.`;
  }
}
