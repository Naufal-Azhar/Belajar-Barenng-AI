import { GoogleGenerativeAI, type Content } from '@google/generative-ai';
import { getLLMConfig } from './llm-config';
import { LLMError, SchemaValidationError } from './validation';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

export interface LLMClient {
  streamText(args: { systemPrompt: string; history: ChatMessage[]; userMessage: string }): AsyncIterable<string>;
  generateStructured<T>(args: { systemPrompt: string; history: ChatMessage[]; userMessage: string; schemaName: string; schemaDescription: string }): Promise<T>;
  extractTextFromPdf(buffer: Buffer): Promise<string>;
}

function mapError(err: unknown): LLMError {
  const msg = (err as Error).message || String(err);
  if (msg.includes('API_KEY_INVALID') || msg.includes('401')) return new LLMError('[Gemini] API key tidak valid');
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) return new LLMError('[Gemini] Rate limit tercapai');
  if (msg.includes('PERMISSION_DENIED')) return new LLMError('[Gemini] Permission denied');
  return new LLMError(`[Gemini] ${msg}`);
}

function toGeminiHistory(history: ChatMessage[]): Content[] {
  return history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));
}

export class GeminiClient implements LLMClient {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    const config = getLLMConfig();
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.modelName = config.model;
  }

  async *streamText(args: { systemPrompt: string; history: ChatMessage[]; userMessage: string }): AsyncIterable<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: args.systemPrompt,
      });
      const chat = model.startChat({ history: toGeminiHistory(args.history) });
      const result = await chat.sendMessageStream(args.userMessage);
      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (err) {
      throw mapError(err);
    }
  }

  async generateStructured<T>(args: { systemPrompt: string; history: ChatMessage[]; userMessage: string; schemaName: string; schemaDescription: string }): Promise<T> {
    const systemWithSchema = `${args.systemPrompt}\n\nOutput HARUS JSON valid sesuai schema "${args.schemaName}": ${args.schemaDescription}. Tidak ada teks lain di luar JSON.`;

    const attempt = async (prompt: string): Promise<T> => {
      try {
        const model = this.genAI.getGenerativeModel({
          model: this.modelName,
          systemInstruction: prompt,
          generationConfig: { responseMimeType: 'application/json' },
        });
        const chat = model.startChat({ history: toGeminiHistory(args.history) });
        const result = await chat.sendMessage(args.userMessage);
        const content = result.response.text();
        return JSON.parse(content) as T;
      } catch (err) {
        if (err instanceof SyntaxError) throw err;
        throw mapError(err);
      }
    };

    try {
      return await attempt(systemWithSchema);
    } catch (err) {
      if (err instanceof SyntaxError) {
        try {
          return await attempt(systemWithSchema + '\n\nPERINGATAN: Response sebelumnya bukan JSON valid. WAJIB output JSON saja.');
        } catch (retryErr) {
          if (retryErr instanceof SyntaxError) {
            throw new SchemaValidationError(`Failed to parse JSON after retry for schema "${args.schemaName}"`);
          }
          throw retryErr;
        }
      }
      throw err;
    }
  }

  async extractTextFromPdf(buffer: Buffer): Promise<string> {
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    return data.text;
  }
}

const _key = '__belajar_llm__';

export function getLLMClient(): LLMClient {
  if (!(globalThis as any)[_key]) {
    if (!process.env.GEMINI_API_KEY || process.env.USE_MOCK_AI === 'true') {
      const { MockLLMClient } = require('./llm-client-mock');
      (globalThis as any)[_key] = new MockLLMClient();
    } else {
      (globalThis as any)[_key] = new GeminiClient();
    }
  }
  return (globalThis as any)[_key];
}
