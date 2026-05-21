'use client';

import { useState, useEffect, useRef } from 'react';
import type { Message, Session } from '@/lib/types';

const MAX_TRIGGERS = 3;
const AI_MSG_THRESHOLD = 5;

export function useExtractionTrigger(messages: Message[], session: Session | null) {
  const [shouldShow, setShouldShow] = useState(false);
  const triggerCount = useRef(0);
  const lastCheckedLen = useRef(0);

  useEffect(() => {
    if (!session || triggerCount.current >= MAX_TRIGGERS) return;

    const aiMessages = messages.filter((m) => m.role === 'ai');
    if (aiMessages.length <= lastCheckedLen.current) return;

    // Trigger every AI_MSG_THRESHOLD ai messages
    if (aiMessages.length > 0 && aiMessages.length % AI_MSG_THRESHOLD === 0) {
      lastCheckedLen.current = aiMessages.length;
      triggerCount.current++;
      setShouldShow(true);
    }
  }, [messages, session]);

  const dismiss = () => setShouldShow(false);
  const accept = () => setShouldShow(false);

  return { shouldShow, dismiss, accept, triggerCount: triggerCount.current };
}
