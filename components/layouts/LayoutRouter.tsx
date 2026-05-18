'use client';

import type { ReactNode } from 'react';
import type {
  LearningMode,
  Message,
  Session,
  ExplainerSectionLabel,
} from '@/lib/types';
import PenjelasLayout from './PenjelasLayout';
import SokratikLayout from './SokratikLayout';
import KuisLayout from './KuisLayout';
import LatihanLayout from './LatihanLayout';

const VALID_MODES: ReadonlyArray<LearningMode> = [
  'explainer',
  'socratic',
  'quiz',
  'latihan',
];

export interface ModeLayoutProps {
  session: Session;
  messages: Message[];
  isStreaming: boolean;
  /** Composer / chat send */
  onSend: (text: string) => void;
  /** Quiz answer submit (mcq/essay) */
  onQuizAnswer: (answer: string) => void;
  /** Latihan attempt submit */
  onLatihanAttempt: (attempt: string) => void;
  /** Penjelas: ask deeper / ask term */
  onAskTerm: (term: string) => void;
  onAskDeeper: (sectionLabel: ExplainerSectionLabel) => void;
  /** Sokratik */
  onSocraticThought: (thought: string) => void;
  onSocraticConfused: () => void;
  /** Kuis: extra controls */
  onAskSimilar: () => void;
  onAskHarder: () => void;
  onQuizSkip: () => void;
  onQuizStop: () => void;
  /** Latihan: difficulty controls */
  onLatihanEasier: () => void;
  onLatihanHarder: () => void;
  onLatihanNew: () => void;
}

interface Props extends ModeLayoutProps {
  currentMode: string;
}

/**
 * Layout_Router (Req 15). Memilih dan me-mount tepat satu Mode_Layout
 * berdasarkan currentMode. Fallback ke Penjelas_Layout untuk nilai invalid (Req 15.5).
 *
 * `messages[]` dimiliki parent page — saat mode berganti, layout ter-unmount
 * tapi messages tetap utuh di parent (Property 18).
 */
export default function LayoutRouter(props: Props): ReactNode {
  const { currentMode, ...rest } = props;
  const mode: LearningMode = (VALID_MODES as readonly string[]).includes(currentMode)
    ? (currentMode as LearningMode)
    : 'explainer';

  switch (mode) {
    case 'explainer':
      return <PenjelasLayout {...rest} />;
    case 'socratic':
      return <SokratikLayout {...rest} />;
    case 'quiz':
      return <KuisLayout {...rest} />;
    case 'latihan':
      return <LatihanLayout {...rest} />;
  }
}
