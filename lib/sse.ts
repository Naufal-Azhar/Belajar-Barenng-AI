import type {
  QuizPayload,
  LatihanPayload,
  ExplainerPayload,
  SocraticPayload,
} from './types';

export type StreamPayload =
  | ExplainerPayload
  | SocraticPayload
  | QuizPayload
  | LatihanPayload;

export type SseEvent =
  | { type: 'token'; data: string }
  | { type: 'payload'; data: StreamPayload }
  | { type: 'done'; data: { messageId: string } }
  | { type: 'error'; data: { message: string } };

/**
 * Encode a single SSE event into the W3C text/event-stream format.
 */
export function encodeSseEvent(evt: SseEvent): string {
  const json = JSON.stringify(evt.data);
  return `event: ${evt.type}\ndata: ${json}\n\n`;
}

/**
 * Parse a buffer of SSE text into events + remaining unparsed text.
 */
export function parseSseEvents(buffer: string): { events: SseEvent[]; remainder: string } {
  const events: SseEvent[] = [];
  const blocks = buffer.split('\n\n');
  const remainder = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    const lines = block.split('\n');
    let eventType = '';
    let dataStr = '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7);
      } else if (line.startsWith('data: ')) {
        dataStr = line.slice(6);
      }
    }

    if (eventType && dataStr) {
      try {
        const data = JSON.parse(dataStr);
        events.push({ type: eventType as SseEvent['type'], data });
      } catch {
        // Skip malformed events
      }
    }
  }

  return { events, remainder };
}

/**
 * Create a controllable SSE stream for use in route handlers.
 */
export function createSseStream() {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });

  return {
    stream,
    write(evt: SseEvent) {
      if (controller) {
        controller.enqueue(encoder.encode(encodeSseEvent(evt)));
      }
    },
    close() {
      if (controller) {
        controller.close();
      }
    },
  };
}
