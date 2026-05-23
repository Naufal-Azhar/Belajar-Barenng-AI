import type { LLMClient, ChatMessage } from './llm-client';

export class MockLLMClient implements LLMClient {
  async *streamText(args: { systemPrompt: string; history: ChatMessage[]; userMessage: string }): AsyncIterable<string> {
    const response = `Ini adalah respons dummy dari AI. Kamu bertanya tentang "${args.userMessage.slice(0, 50)}". Untuk respons real, masukkan GEMINI_API_KEY di .env.local.`;
    const words = response.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 30));
    }
  }

  async generateStructured<T>(args: { systemPrompt: string; history: ChatMessage[]; userMessage: string; schemaName: string; schemaDescription: string }): Promise<T> {
    const prompt = args.systemPrompt.toLowerCase();

    if (prompt.includes('ekstrak') || prompt.includes('flashcard')) {
      return { cards: [
        { question: 'Apa fungsi mitokondria dalam sel?', answer: 'Mitokondria berfungsi sebagai pembangkit energi (ATP) melalui respirasi seluler', concept: 'mitokondria' },
        { question: 'Apa hasil akhir fotosintesis?', answer: 'Glukosa (C6H12O6) dan oksigen (O2)', concept: 'fotosintesis' },
        { question: 'Di mana fotosintesis terjadi?', answer: 'Di kloroplas, tepatnya pada membran tilakoid dan stroma', concept: 'kloroplas' },
      ] } as T;
    }

    if (prompt.includes('nilai') || prompt.includes('grade')) {
      return { grade: 3, feedback: 'Bagus! Jawabanmu sudah mencakup poin utama.', rephrasedQuestion: 'Jelaskan dengan kata-katamu sendiri, bagaimana proses ini bekerja?' } as T;
    }

    if (prompt.includes('explainer') || prompt.includes('jelaskan')) {
      return { kind: 'explainer', title: 'Penjelasan Konsep', sections: [
        { label: 'Inti', body: 'Ini adalah penjelasan inti dari konsep yang kamu tanyakan.' },
        { label: 'Analogi', body: 'Bayangkan sel seperti sebuah kota kecil.' },
        { label: 'TL;DR', body: 'Setiap organel punya tugas masing-masing.' },
      ], keyTerms: ['organel', 'mitokondria', 'nukleus'] } as T;
    }

    if (prompt.includes('socratic') || prompt.includes('pertanyaan')) {
      return { kind: 'socratic', question: 'Menurutmu, kenapa sel membutuhkan energi?', hints: [
        'Coba pikirkan aktivitas apa saja yang dilakukan sel...',
        'Sel perlu energi untuk transport zat, membelah, dan menjaga bentuknya',
        'Tanpa ATP, pompa ion berhenti dan sel akan mengalami lisis',
      ], depth: 2 } as T;
    }

    if (prompt.includes('quiz') || prompt.includes('soal')) {
      return { kind: 'quiz', type: 'mcq', question: 'Organel sel yang berperan dalam respirasi seluler adalah...', options: ['Ribosom', 'Mitokondria', 'Lisosom', 'Badan Golgi'], correctAnswer: 'Mitokondria', explanation: 'Mitokondria adalah tempat berlangsungnya respirasi seluler.' } as T;
    }

    if (prompt.includes('latihan') || prompt.includes('step')) {
      return { kind: 'latihan', question: 'Hitung jumlah ATP dari 1 molekul glukosa.', steps: [
        { title: 'Glikolisis', detail: 'Menghasilkan 2 ATP net dan 2 NADH' },
        { title: 'Siklus Krebs', detail: 'Menghasilkan 2 ATP, 6 NADH, 2 FADH2' },
        { title: 'Rantai Transpor Elektron', detail: 'NADH → 2.5 ATP, FADH2 → 1.5 ATP' },
      ] } as T;
    }

    if (prompt.includes('ringkas') || prompt.includes('summary')) {
      return { topicsCovered: ['Respirasi Seluler', 'Fotosintesis'], keyPoints: ['Mitokondria menghasilkan ATP'], recommendations: ['Pelajari rantai transpor elektron'], createdAt: new Date().toISOString() } as T;
    }

    return { kind: 'explainer', title: 'Mock Response', sections: [{ label: 'Inti', body: 'Ini adalah respons dummy.' }], keyTerms: [] } as T;
  }

  async extractTextFromPdf(): Promise<string> {
    return '# Materi Dummy\n\nIni adalah hasil ekstraksi PDF dummy untuk testing.\n\n## Konsep Utama\n- Fotosintesis mengubah CO2 dan H2O menjadi glukosa\n- Respirasi sel menghasilkan ATP';
  }
}
