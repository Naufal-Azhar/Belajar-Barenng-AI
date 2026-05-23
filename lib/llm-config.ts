export interface LLMConfig {
  apiKey: string;
  model: string;
}

export function getLLMConfig(): LLMConfig {
  const apiKey = process.env.GEMINI_API_KEY || '';
  const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (!apiKey && process.env.USE_MOCK_AI !== 'true') {
    console.warn('[LLM] GEMINI_API_KEY kosong dan USE_MOCK_AI bukan true — AI calls akan gagal');
  }

  return { apiKey, model };
}
