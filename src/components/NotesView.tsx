'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase, type Note } from '@/lib/SupabaseContext';

const NOTE_COLORS = [
  { id: 'violet',  gradient: 'from-violet-500 via-purple-500 to-indigo-600',   text: 'white' },
  { id: 'cyan',    gradient: 'from-cyan-400 via-sky-400 to-blue-500',           text: 'white' },
  { id: 'rose',    gradient: 'from-rose-400 via-pink-500 to-fuchsia-600',       text: 'white' },
  { id: 'amber',   gradient: 'from-amber-400 via-orange-400 to-red-500',        text: 'white' },
  { id: 'emerald', gradient: 'from-emerald-400 via-teal-500 to-cyan-600',       text: 'white' },
  { id: 'slate',   gradient: 'from-slate-500 via-slate-600 to-slate-700',       text: 'white' },
];

function getColor(id: string) {
  return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0];
}

// ── NOTE CARD ──────────────────────────────────────────────────────────────────
function NoteCard({
  note, onEdit, onDelete, onPin,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const color = getColor(note.color);
  const ref = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const timeStr = new Date(note.updated_at || note.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, scale: 0.94, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="relative rounded-[20px] overflow-hidden cursor-pointer group"
      style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.10)' }}
      onClick={() => onEdit(note)}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${color.gradient}`} />
      {/* Decorative shapes */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
      <div className="absolute top-3 -left-3 w-12 h-12 bg-white/10 rounded-full blur-md pointer-events-none" />

      <div className="relative z-10 p-4 min-h-[120px] flex flex-col">
        <div className="flex justify-between items-start gap-1.5 mb-2">
          <div className="flex-1 min-w-0">
            {note.pinned && <span className="text-white/60 text-[10px] mb-0.5 block">📌 Pinned</span>}
            {note.title ? (
              <p className="text-white font-black text-sm leading-snug line-clamp-2">{note.title}</p>
            ) : (
              <p className="text-white/50 font-semibold text-sm italic leading-snug line-clamp-2">Untitled</p>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="white">
              <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>
        </div>

        {note.content && (
          <p className="text-white/75 text-xs leading-relaxed line-clamp-3 flex-1">{note.content}</p>
        )}

        <p className="text-white/40 text-[10px] font-semibold mt-3">{timeStr}</p>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: -4 }}
            transition={{ duration: 0.14 }}
            onClick={e => e.stopPropagation()}
            className="absolute top-9 right-3 z-20 w-36 bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-border/60 overflow-hidden"
          >
            {[
              { label: note.pinned ? 'Unpin' : 'Pin', emoji: '📌', action: () => { onPin(note.id, !note.pinned); setMenuOpen(false); } },
              { label: 'Edit', emoji: '✏️', action: () => { onEdit(note); setMenuOpen(false); } },
              { label: 'Delete', emoji: '🗑️', danger: true, action: () => { onDelete(note.id); setMenuOpen(false); } },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className={`flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-semibold transition-all ${
                  item.danger
                    ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30'
                    : 'text-foreground hover:bg-muted/60'
                }`}
              >
                <span>{item.emoji}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── NOTE EDITOR MODAL ──────────────────────────────────────────────────────────
function NoteEditor({
  note, onSave, onClose,
}: {
  note: Partial<Note> | null;
  onSave: (title: string, content: string, color: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [color, setColor] = useState(note?.color ?? NOTE_COLORS[0].id);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const colorConfig = getColor(color);

  useEffect(() => {
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, []);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) { onClose(); return; }
    setSaving(true);
    await onSave(title.trim(), content.trim(), color);
    setSaving(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 60, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 30, stiffness: 380 }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-[28px] overflow-hidden shadow-2xl"
        style={{ maxHeight: '88vh' }}
      >
        {/* Color strip header */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${colorConfig.gradient} transition-all duration-300`} />

        <div className="p-5 flex flex-col gap-4 overflow-y-auto">
          {/* Title */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent text-foreground font-black text-xl placeholder-muted-foreground/30 outline-none"
          />

          {/* Divider */}
          <div className="h-px bg-border/50" />

          {/* Content */}
          <textarea
            ref={textareaRef}
            placeholder="Start writing..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={7}
            className="w-full bg-transparent text-foreground/85 text-[15px] leading-relaxed placeholder-muted-foreground/30 outline-none resize-none"
          />

          {/* Color selector */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Theme</span>
            <div className="flex gap-2 flex-1">
              {NOTE_COLORS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setColor(c.id)}
                  title={c.id}
                  className={`h-6 flex-1 rounded-full bg-gradient-to-r ${c.gradient} transition-all active:scale-90 ${
                    color === c.id ? 'ring-2 ring-offset-2 ring-foreground/30 scale-110' : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Hint */}
          <p className="text-muted-foreground/40 text-[10px] text-right">⌘↵ to save • Esc to close</p>

          {/* Action buttons */}
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              className="flex-1 bg-muted text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-2xl py-3.5 transition-all active:scale-95 hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`flex-1 bg-gradient-to-r ${colorConfig.gradient} text-white font-black text-xs uppercase tracking-widest rounded-2xl py-3.5 shadow-lg transition-all active:scale-95 disabled:opacity-60 flex items-center justify-center gap-2`}
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                note?.id ? 'Save' : 'Create'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── MAIN VIEW ──────────────────────────────────────────────────────────────────
export default function NotesView() {
  const { profile, notes, addNote, updateNote, deleteNote } = useSupabase();
  const [editingNote, setEditingNote] = useState<Partial<Note> | 'new' | null>(null);
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-7 h-7 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = notes.filter(n =>
    !q || n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q)
  );
  const pinned = filtered.filter(n => n.pinned);
  const rest = filtered.filter(n => !n.pinned);

  const handleSave = async (title: string, content: string, color: string) => {
    if (editingNote && editingNote !== 'new' && (editingNote as Note).id) {
      await updateNote((editingNote as Note).id, { title, content, color });
    } else {
      await addNote(title, content, color);
    }
    setEditingNote(null);
  };

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0a0a0a] pb-32">
      <div className="max-w-md mx-auto px-4 pt-9">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em]">Workspace</p>
            <h1 className="text-[26px] font-black text-foreground leading-tight mt-0.5 tracking-tight">My Notes</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setEditingNote('new')}
            className="w-11 h-11 rounded-[16px] bg-gradient-to-br from-violet-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/30"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        </div>

        {/* ── SEARCH ── */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            ref={searchRef}
            type="text"
            placeholder="Search notes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900/80 border border-border/60 rounded-[16px] pl-10 pr-10 py-3 text-sm text-foreground placeholder-muted-foreground/40 outline-none focus:border-foreground/20 transition-all shadow-sm"
          />
          <AnimatePresence>
            {search && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground/50 hover:text-foreground transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* ── STATS PILL ── */}
        {notes.length > 0 && !search && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 mb-5"
          >
            <div className="flex-1 bg-white dark:bg-neutral-900/80 rounded-2xl px-4 py-3 border border-border/50 flex items-center gap-2 shadow-sm">
              <span className="text-xl">📝</span>
              <div>
                <p className="text-foreground font-black text-sm leading-none">{notes.length}</p>
                <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">Total notes</p>
              </div>
            </div>
            <div className="flex-1 bg-white dark:bg-neutral-900/80 rounded-2xl px-4 py-3 border border-border/50 flex items-center gap-2 shadow-sm">
              <span className="text-xl">📌</span>
              <div>
                <p className="text-foreground font-black text-sm leading-none">{pinned.length}</p>
                <p className="text-muted-foreground text-[10px] font-semibold mt-0.5">Pinned</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── EMPTY STATE ── */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center justify-center py-24 text-center"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="w-20 h-20 rounded-[24px] bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-5 shadow-xl shadow-violet-500/30"
            >
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </motion.div>
            <p className="text-foreground font-black text-lg tracking-tight">
              {search ? 'No results found' : 'Start taking notes'}
            </p>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-[200px] leading-relaxed">
              {search ? `Nothing matches "${search}"` : 'Capture ideas, plans, and thoughts'}
            </p>
            {!search && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditingNote('new')}
                className="mt-7 bg-gradient-to-r from-violet-500 to-indigo-600 text-white font-black text-sm uppercase tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-violet-500/30 active:scale-95 transition-all"
              >
                + New Note
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── PINNED ── */}
        {pinned.length > 0 && (
          <section className="mb-6">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em] mb-3">📌 Pinned</p>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {pinned.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={n => setEditingNote(n)}
                    onDelete={id => deleteNote(id)}
                    onPin={(id, p) => updateNote(id, { pinned: p })}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

        {/* ── ALL NOTES ── */}
        {rest.length > 0 && (
          <section className="mb-4">
            {pinned.length > 0 && (
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.18em] mb-3">All Notes</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {rest.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={n => setEditingNote(n)}
                    onDelete={id => deleteNote(id)}
                    onPin={(id, p) => updateNote(id, { pinned: p })}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}

      </div>

      {/* ── EDITOR MODAL ── */}
      <AnimatePresence>
        {editingNote !== null && (
          <NoteEditor
            note={editingNote === 'new' ? null : editingNote as Partial<Note>}
            onSave={handleSave}
            onClose={() => setEditingNote(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
