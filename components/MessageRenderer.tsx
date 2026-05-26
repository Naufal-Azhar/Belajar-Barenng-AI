'use client';

import type {
  Message,
  LearningMode,
  ExplainerSectionLabel,
} from '@/lib/types';
import MessageBubble from './MessageBubble';
import ActionChip from './ActionChip';
import CompactPayloadCard from './CompactPayloadCard';
import ExplainerComponent from './ExplainerComponent';
import SocraticComponent from './SocraticComponent';
import QuizComponent from './QuizComponent';
import LatihanComponent from './LatihanComponent';

/**
 * MessageRenderer — komponen factory yang implement decision tree tunggal
 * untuk render pesan di chat history. Tujuan:
 *
 *   - Centralize logic rendering supaya 4 layout (Penjelas/Sokratik/Kuis/Latihan)
 *     pakai pola konsisten.
 *   - Fix bug "JSON mentah" di SokratikLayout/KuisLayout/LatihanLayout: pesan
 *     AI dengan payload dari mode lain dirender sebagai CompactPayloadCard,
 *     BUKAN MessageBubble yang ngeprint JSON-stringified content.
 *   - Bedakan pesan user manual vs auto-trigger via ActionChip.
 *
 * Decision tree:
 *
 *   role === 'user':
 *     intent && intent !== 'manual' → ActionChip
 *     else                          → MessageBubble (user bubble)
 *
 *   role === 'ai':
 *     no payload                    → MessageBubble (text-chunk fallback)
 *     payload.kind === activeMode   → komponen full interaktif sesuai kind
 *     payload.kind ≠ activeMode     → CompactPayloadCard (preview ringkas)
 *     payload tanpa .kind           → MessageBubble (graceful degradation)
 */

export interface MessageRendererHandlers {
  onSubmitThought?: (thought: string) => void;
  onConfused?: () => void;
  onSubmitAnswer?: (answer: string) => void;
  onSubmitAttempt?: (attempt: string) => void;
  onAskTerm?: (term: string) => void;
  onAskDeeper?: (sectionLabel: ExplainerSectionLabel) => void;
  onAskSimilar?: () => void;
  onAskHarder?: () => void;
}

interface Props {
  message: Message;
  activeMode: LearningMode;
  handlers?: MessageRendererHandlers;
}

const noopThought = (_t: string) => {};
const noopConfused = () => {};
const noopAnswer = (_a: string) => {};
const noopAttempt = (_a: string) => {};

export default function MessageRenderer({ message, activeMode, handlers }: Props) {
  const h = handlers ?? {};

  // ===== USER =====
  if (message.role === 'user') {
    if (message.intent && message.intent !== 'manual') {
      return (
        <ActionChip
          intent={message.intent}
          actionLabel={message.actionLabel}
          content={message.content}
        />
      );
    }
    return <MessageBubble role="user" content={message.content} />;
  }

  // ===== AI =====
  // No payload → plain text bubble (mis. respons general/non-academic)
  if (!message.payload) {
    return <MessageBubble role="ai" content={message.content} />;
  }

  const payload = message.payload;
  const kind = (payload as { kind?: string }).kind;

  // Defensive: payload exists tapi kind nggak valid (data corrupt) → graceful fallback
  if (!kind || !['explainer', 'socratic', 'quiz', 'latihan'].includes(kind)) {
    return <MessageBubble role="ai" content={message.content} />;
  }

  // Cross-mode: payload kind ≠ activeMode → render compact card non-interaktif
  if (kind !== activeMode) {
    return <CompactPayloadCard payload={payload} />;
  }

  // Mode aktif: render komponen full interaktif sesuai kind
  switch (payload.kind) {
    case 'explainer':
      return (
        <ExplainerComponent
          payload={payload}
          onAskTerm={h.onAskTerm}
          onAskDeeper={h.onAskDeeper}
        />
      );
    case 'socratic':
      return (
        <SocraticComponent
          payload={payload}
          onSubmitThought={h.onSubmitThought ?? noopThought}
          onConfused={h.onConfused ?? noopConfused}
        />
      );
    case 'quiz':
      return (
        <QuizComponent
          payload={payload}
          onSubmitAnswer={h.onSubmitAnswer ?? noopAnswer}
          onAskSimilar={h.onAskSimilar}
          onAskHarder={h.onAskHarder}
        />
      );
    case 'latihan':
      return (
        <LatihanComponent
          payload={payload}
          onSubmitAttempt={h.onSubmitAttempt ?? noopAttempt}
        />
      );
  }
}
