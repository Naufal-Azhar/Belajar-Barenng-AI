'use client';

import { useState, useRef, useEffect, type ReactNode, type KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Session } from '@/lib/types';
import { groupByDate } from '@/lib/date-grouping';

interface SidebarProps {
  sessions: Session[];
  activeSessionId: string | null;
  isLoading?: boolean;
  /** Optional: custom React node untuk footer (mis. login button di Phase 5) */
  loginSlot?: ReactNode;
  onSelect: (sessionId: string) => void;
  onNew: () => void;
  onRename: (sessionId: string, newTitle: string) => void;
  onDelete: (sessionId: string) => void;
  /** Mobile-only: control drawer open state */
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

/**
 * Sidebar list sesi. Murni presentational — semua state interaction
 * (fetching, optimistic updates) handled oleh parent via callback.
 *
 * Features:
 * - Date grouping (Hari ini / Kemarin / dst)
 * - Active session highlight
 * - Hover menu (rename, delete)
 * - Inline rename dengan double-click atau menu
 * - Delete confirmation modal kecil
 * - Mobile drawer (kalau isOpenMobile prop dipakai)
 */
export default function Sidebar({
  sessions,
  activeSessionId,
  isLoading = false,
  loginSlot,
  onSelect,
  onNew,
  onRename,
  onDelete,
  isOpenMobile = false,
  onCloseMobile,
}: SidebarProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input saat masuk rename mode
  useEffect(() => {
    if (renamingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [renamingId]);

  const groups = groupByDate(sessions);
  const sessionToDelete = sessions.find((s) => s.sessionId === deletingId);

  function startRename(session: Session) {
    setRenamingId(session.sessionId);
    setRenameValue(session.title ?? '');
  }

  function commitRename() {
    if (!renamingId) return;
    const trimmed = renameValue.trim();
    if (trimmed.length > 0 && trimmed.length <= 100) {
      onRename(renamingId, trimmed);
    }
    setRenamingId(null);
    setRenameValue('');
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue('');
  }

  function handleRenameKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelRename();
    }
  }

  function confirmDelete() {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  }

  const sidebarContent = (
    <div className="flex h-full flex-col bg-canvas border-r border-hairline w-64">
      {/* Header */}
      <div className="px-3 py-3 border-b border-hairline">
        <button
          onClick={onNew}
          aria-label="Sesi baru"
          className="w-full flex items-center justify-center gap-2 rounded-md border border-hairline px-3 py-2 text-sm font-sans font-medium text-ink hover:bg-surface transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          Sesi Baru
        </button>
      </div>

      {/* Sessions list */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading && sessions.length === 0 ? (
          <SidebarSkeleton />
        ) : sessions.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <p className="text-caption text-muted-soft">Belum ada sesi</p>
            <p className="text-caption text-muted-soft mt-1">Klik "Sesi Baru" untuk mulai</p>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.key} className="mb-3">
              <h3 className="px-3 py-1 text-caption-upper uppercase tracking-wider text-muted-soft">
                {group.key}
              </h3>
              <ul>
                {group.items.map((session) => (
                  <SidebarItem
                    key={session.sessionId}
                    session={session}
                    isActive={session.sessionId === activeSessionId}
                    isRenaming={renamingId === session.sessionId}
                    renameValue={renameValue}
                    inputRef={renamingId === session.sessionId ? inputRef : undefined}
                    onSelect={() => onSelect(session.sessionId)}
                    onStartRename={() => startRename(session)}
                    onRenameChange={setRenameValue}
                    onRenameKey={handleRenameKey}
                    onRenameBlur={commitRename}
                    onAskDelete={() => setDeletingId(session.sessionId)}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
      </nav>

      {/* Footer (login slot) */}
      {loginSlot && (
        <div className="px-3 py-3 border-t border-hairline">{loginSlot}</div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <aside className="hidden md:block h-full">
        {sidebarContent}
      </aside>

      {/* Mobile: drawer */}
      <AnimatePresence>
        {isOpenMobile && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="md:hidden fixed inset-0 bg-black/30 z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 h-full"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Delete confirmation modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingId(null)}
              className="fixed inset-0 bg-black/40 z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              role="dialog"
              aria-labelledby="delete-confirm-title"
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-sm bg-canvas border border-hairline rounded-lg shadow-subtle p-5"
            >
              <h2 id="delete-confirm-title" className="text-body-md font-medium text-ink mb-2">
                Hapus sesi ini?
              </h2>
              <p className="text-body-sm text-muted mb-4">
                "{sessionToDelete.title ?? 'Sesi tanpa judul'}" akan dihapus dari riwayat. Tidak dapat dipulihkan.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeletingId(null)}
                  className="rounded-md border border-hairline px-3 py-1.5 text-caption font-sans text-muted hover:bg-surface transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="rounded-md bg-error/90 hover:bg-error text-white px-3 py-1.5 text-caption font-sans font-medium transition-colors"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-2 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-9 bg-surface/60 rounded-md animate-pulse" />
      ))}
    </div>
  );
}

interface SidebarItemProps {
  session: Session;
  isActive: boolean;
  isRenaming: boolean;
  renameValue: string;
  inputRef?: React.RefObject<HTMLInputElement>;
  onSelect: () => void;
  onStartRename: () => void;
  onRenameChange: (v: string) => void;
  onRenameKey: (e: KeyboardEvent<HTMLInputElement>) => void;
  onRenameBlur: () => void;
  onAskDelete: () => void;
}

function SidebarItem({
  session,
  isActive,
  isRenaming,
  renameValue,
  inputRef,
  onSelect,
  onStartRename,
  onRenameChange,
  onRenameKey,
  onRenameBlur,
  onAskDelete,
}: SidebarItemProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const displayTitle = session.title ?? 'Sesi tanpa judul';
  const isEnded = !!session.endedAt;

  return (
    <li className="relative group">
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onKeyDown={onRenameKey}
          onBlur={onRenameBlur}
          maxLength={100}
          className="w-full px-3 py-1.5 rounded-md text-body-sm text-ink bg-surface border border-primary/40 outline-none"
        />
      ) : (
        <div
          onClick={onSelect}
          onDoubleClick={onStartRename}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect();
            }
          }}
          className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-md cursor-pointer text-body-sm transition-colors ${
            isActive
              ? 'bg-surface text-ink font-medium'
              : 'text-muted hover:bg-surface/60 hover:text-ink'
          }`}
        >
          <span className="truncate flex-1 flex items-center gap-1.5">
            {isEnded && <span className="text-success" aria-label="Sesi selesai">✓</span>}
            <span className="truncate">{displayTitle}</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            aria-label="Menu sesi"
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 px-1 hover:bg-surface rounded transition-opacity"
          >
            ⋯
          </button>
        </div>
      )}

      {/* Dropdown menu */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute right-2 top-9 z-50 bg-canvas border border-hairline rounded-md shadow-subtle py-1 min-w-[120px]">
            <button
              onClick={() => {
                onStartRename();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-caption text-ink hover:bg-surface transition-colors"
            >
              Ubah nama
            </button>
            <button
              onClick={() => {
                onAskDelete();
                setMenuOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 text-caption text-error hover:bg-error/10 transition-colors"
            >
              Hapus
            </button>
          </div>
        </>
      )}
    </li>
  );
}
