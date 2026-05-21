import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiError } from './validation';

export interface GeminiClientInterface {
  streamText(args: {
    systemPrompt: string;
    history: { role: 'user' | 'model'; text: string }[];
    userMessage: string;
  }): AsyncIterable<string>;

  extractFromPdf(args: {
    pdfBase64: string;
    mimeType: 'application/pdf';
    instruction: string;
  }): Promise<string>;

  generateStructured<T>(args: {
    systemPrompt: string;
    history: { role: 'user' | 'model'; text: string }[];
    userMessage: string;
    schema: object;
  }): Promise<T>;
}

export function pdfBufferToBase64(buf: Buffer): string {
  return buf.toString('base64');
}

export function base64ToPdfBuffer(s: string): Buffer {
  return Buffer.from(s, 'base64');
}

export class GeminiClient implements GeminiClientInterface {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'gemini-1.5-flash') {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async *streamText(args: {
    systemPrompt: string;
    history: { role: 'user' | 'model'; text: string }[];
    userMessage: string;
  }): AsyncIterable<string> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: args.systemPrompt,
      });

      const chat = model.startChat({
        history: args.history.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      });

      const result = await chat.sendMessageStream(args.userMessage);

      for await (const chunk of result.stream) {
        const text = chunk.text();
        if (text) yield text;
      }
    } catch (err) {
      throw new GeminiError(`Gemini stream error: ${(err as Error).message}`);
    }
  }

  async extractFromPdf(args: {
    pdfBase64: string;
    mimeType: 'application/pdf';
    instruction: string;
  }): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });

      const result = await model.generateContent([
        { text: args.instruction },
        {
          inlineData: {
            data: args.pdfBase64,
            mimeType: args.mimeType,
          },
        },
      ]);

      const response = result.response;
      return response.text();
    } catch (err) {
      throw new GeminiError(`Gemini PDF extraction error: ${(err as Error).message}`);
    }
  }

  async generateStructured<T>(args: {
    systemPrompt: string;
    history: { role: 'user' | 'model'; text: string }[];
    userMessage: string;
    schema: object;
  }): Promise<T> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: args.systemPrompt,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: args.schema as any,
        },
      });

      const chat = model.startChat({
        history: args.history.map((h) => ({
          role: h.role,
          parts: [{ text: h.text }],
        })),
      });

      const result = await chat.sendMessage(args.userMessage);
      const text = result.response.text();
      return JSON.parse(text) as T;
    } catch (err) {
      throw new GeminiError(`Gemini structured error: ${(err as Error).message}`);
    }
  }
}

// Singleton
let _client: GeminiClientInterface | null = null;

export function getGeminiClient(): GeminiClientInterface {
  if (!_client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || process.env.USE_MOCK_AI === 'true') {
      const { MockGeminiClient } = require('./gemini-client-mock');
      _client = new MockGeminiClient();
    } else {
      _client = new GeminiClient(apiKey, process.env.GEMINI_MODEL || 'gemini-1.5-flash');
    }
  }
  return _client!;
}

export function setGeminiClient(client: GeminiClientInterface) {
  _client = client;
}
