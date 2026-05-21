'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExtractedCard } from '@/lib/types';
import { getDeviceId } from '@/lib/device-id';

interface Props {
  sessionId: string;
  onClose: () => void;
}

export default function ExtractionModal({ sessionId, onClose }: Props) {
  const [stage, setStage] = useState<'loading' | 'selecting' | 'saving' | 'done' | 'error'>('loading');
  const [cards, setCards] = useState<(ExtractedCard & { selected: boolean })[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  // Fetch extraction on mount
  useState(() => {
    const deviceId = getDeviceId();
    fetch('/api/cards/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, deviceId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.cards?.length) {
          setCards(data.cards.map((c: ExtractedCard) => ({ ...c, selected: true })));
          setStage('selecting');
        } else {
          setStage('error');
        }
      })
      .catch(() => setStage('error'));
  });

  const toggleCard = (idx: number) => {
    setCards((prev) => prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)));
  };

  const handleSave = async () => {
    const selected = cards.filter((c) => c.selected);
    if (!selected.length) { onClose(); return; }

    setStage('saving');
    try {
      const res = await fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: getDeviceId(),
          sessionId,
          cards: selected.map(({ question, answer, concept }) => ({ question, answer, concept })),
        }),
      });
      const data = await res.json();
      setSavedCount(data.saved || 0);
      setStage('done');
      setTimeout(onClose, 1500);
    } catch {
      setStage('error');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-xl bg-surface p-5 shadow-xl"
        >
          {stage === 'loading' && (
            <div className="text-center py-8">
              <div className="animate-pulse text-muted">Mengekstrak konsep penting...</div>
            </div>
          )}

          {stage === 'selecting' && (
            <>
              <h3 className="text-lg font-semibold text-ink mb-3">💡 Simpan ke Memori</h3>
              <p className="text-sm text-muted mb-4">Pilih kartu yang ingin disimpan untuk review nanti:</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cards.map((card, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      card.selected ? 'border-primary/50 bg-primary/5' : 'border-hairline'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={card.selected}
                      onChange={() => toggleCard(i)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink">{card.question}</p>
                      <p className="text-xs text-muted mt-1 truncate">{card.answer}</p>
                      <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {card.concept}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={onClose} className="flex-1 py-2 text-sm text-muted border border-hairline rounded-lg hover:bg-muted/5">
                  Nanti
                </button>
                <button onClick={handleSave} className="flex-1 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90">
                  Simpan ({cards.filter((c) => c.selected).length})
                </button>
              </div>
            </>
          )}

          {stage === 'saving' && (
            <div className="text-center py-8">
              <div className="animate-pulse text-muted">Menyimpan kartu...</div>
            </div>
          )}

          {stage === 'done' && (
            <div className="text-center py-8">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-ink font-medium">{savedCount} kartu disimpan!</p>
              <p className="text-xs text-muted mt-1">Akan muncul di review besok</p>
            </div>
          )}

          {stage === 'error' && (
            <div className="text-center py-8">
              <p className="text-muted">Tidak bisa mengekstrak kartu saat ini</p>
              <button onClick={onClose} className="mt-3 text-sm text-primary">Tutup</button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
