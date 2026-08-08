'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase, type Note } from '@/lib/SupabaseContext';

// Color palettes for note cards — each a gradient pair
const NOTE_COLORS = [
  { id: 'violet',  gradient: 'from-[#a29bfe] via-[#6c5ce7] to-[#8854d0]', dot: '#6c5ce7' },
  { id: 'cyan',    gradient: 'from-[#0fbcf9] via-[#07d7f6] to-[#48dbfb]', dot: '#07d7f6' },
  { id: 'rose',    gradient: 'from-[#f8a5c2] via-[#f56fa8] to-[#e84393]', dot: '#e84393' },
  { id: 'amber',   gradient: 'from-[#f9ca24] via-[#f0932b] to-[#e55039]', dot: '#f0932b' },
  { id: 'emerald', gradient: 'from-[#55efc4] via-[#00b894] to-[#00cec9]', dot: '#00b894' },
  { id: 'indigo',  gradient: 'from-[#74b9ff] via-[#0984e3] to-[#0652dd]', dot: '#0984e3' },
];

function getColorConfig(colorId: string) {
  return NOTE_COLORS.find(c => c.id === colorId) || NOTE_COLORS[0];
}

// ─── NOTE CARD ────────────────────────────────────────────────────────────────
function NoteCard({
  note,
  onEdit,
  onDelete,
  onPin,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const color = getColorConfig(note.color);

  const timeStr = new Date(note.updated_at || note.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.92, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -8 }}
      transition={{ duration: 0.25 }}
      className="relative group rounded-2xl overflow-hidden shadow-md cursor-pointer"
      onClick={() => onEdit(note)}
    >
      {/* Gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${color.gradient} opacity-90`} />

      {/* Blob decoration */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/15 rounded-full blur-xl pointer-events-none" />
      <div className="absolute -top-4 -left-4 w-16 h-16 bg-white/10 rounded-full blur-lg pointer-events-none" />

      <div className="relative z-10 p-4 flex flex-col gap-2 min-h-[130px]">
        {/* Pin + menu row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {note.title && (
              <p className="text-white font-black text-sm leading-tight line-clamp-2">{note.title}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {note.pinned && (
              <span className="text-white/80 text-xs">📌</span>
            )}
            {/* Menu button */}
            <button
              onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
              className="w-7 h-7 rounded-xl bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content preview */}
        {note.content && (
          <p className="text-white/80 text-xs leading-relaxed line-clamp-3 flex-1">{note.content}</p>
        )}

        {/* Footer */}
        <p className="text-white/50 text-[10px] font-semibold mt-auto">{timeStr}</p>
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute top-10 right-3 z-20 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-border overflow-hidden min-w-[130px]"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-all"
              onClick={() => { onPin(note.id, !note.pinned); setShowMenu(false); }}
            >
              <span>{note.pinned ? '📌 Unpin' : '📌 Pin'}</span>
            </button>
            <button
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-semibold text-foreground hover:bg-muted/50 transition-all"
              onClick={() => { onEdit(note); setShowMenu(false); }}
            >
              <span>✏️ Edit</span>
            </button>
            <button
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
              onClick={() => { onDelete(note.id); setShowMenu(false); }}
            >
              <span>🗑 Delete</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── EDITOR MODAL ─────────────────────────────────────────────────────────────
function NoteEditor({
  note,
  onSave,
  onClose,
}: {
  note: Partial<Note> | null;
  onSave: (title: string, content: string, color: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title || '');
  const [content, setContent] = useState(note?.content || '');
  const [selectedColor, setSelectedColor] = useState(note?.color || NOTE_COLORS[0].id);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const colorConfig = getColorConfig(selectedColor);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) { onClose(); return; }
    onSave(title.trim(), content.trim(), selectedColor);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center sm:items-center px-4 pb-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.96 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 40, opacity: 0, scale: 0.96 }}
        transition={{ type: 'spring', damping: 28, stiffness: 350 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl"
      >
        {/* Gradient header strip */}
        <div className={`h-2 w-full bg-gradient-to-r ${colorConfig.gradient}`} />

        <div className="p-5 space-y-4">
          {/* Title */}
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-transparent text-foreground font-black text-lg placeholder-muted-foreground/40 outline-none border-b border-border/40 pb-2"
          />

          {/* Content */}
          <textarea
            ref={textareaRef}
            placeholder="Write your note..."
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={6}
            className="w-full bg-transparent text-foreground/90 text-sm placeholder-muted-foreground/40 outline-none resize-none leading-relaxed"
          />

          {/* Color picker */}
          <div className="flex items-center gap-2 pt-2 border-t border-border/40">
            <span className="text-muted-foreground text-[11px] font-bold uppercase tracking-widest mr-1">Color</span>
            {NOTE_COLORS.map(c => (
              <button
                key={c.id}
                onClick={() => setSelectedColor(c.id)}
                className={`w-6 h-6 rounded-full bg-gradient-to-br ${c.gradient} transition-all active:scale-90 ${
                  selectedColor === c.id ? 'ring-2 ring-offset-2 ring-foreground/30 scale-110' : ''
                }`}
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onClose}
              className="flex-1 bg-muted border border-border text-muted-foreground font-bold text-xs uppercase tracking-widest rounded-xl py-3 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className={`flex-1 bg-gradient-to-r ${colorConfig.gradient} text-white font-black text-xs uppercase tracking-widest rounded-xl py-3 shadow-md transition-all active:scale-95`}
            >
              {note?.id ? 'Save Changes' : 'Create Note'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── MAIN NOTES VIEW ──────────────────────────────────────────────────────────
export default function NotesView() {
  const { profile, notes, addNote, updateNote, deleteNote } = useSupabase();
  const [editingNote, setEditingNote] = useState<Partial<Note> | null | 'new'>(null);
  const [search, setSearch] = useState('');

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin" />
          <p className="text-muted-foreground text-[11px] uppercase tracking-widest">Loading Notes...</p>
        </div>
      </div>
    );
  }

  const filteredNotes = notes.filter(n => {
    if (!search) return true;
    const q = search.toLowerCase();
    return n.title?.toLowerCase().includes(q) || n.content?.toLowerCase().includes(q);
  });

  const pinnedNotes = filteredNotes.filter(n => n.pinned);
  const unpinnedNotes = filteredNotes.filter(n => !n.pinned);

  const handleSave = async (title: string, content: string, color: string) => {
    if (editingNote && editingNote !== 'new' && editingNote.id) {
      await updateNote(editingNote.id, { title, content, color });
    } else {
      await addNote(title, content, color);
    }
    setEditingNote(null);
  };

  const handleEdit = (note: Note) => setEditingNote(note);
  const handleDelete = (id: string) => deleteNote(id);
  const handlePin = (id: string, pinned: boolean) => updateNote(id, { pinned });

  return (
    <div className="min-h-screen bg-[#f5f6fa] dark:bg-[#0d0d0d] text-foreground pb-32">
      <div className="max-w-md mx-auto px-5 pt-9 pb-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Personal</p>
            <h1 className="text-2xl font-black text-foreground mt-0.5">My Notes</h1>
          </div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setEditingNote('new')}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#a29bfe] to-[#6c5ce7] text-white flex items-center justify-center shadow-lg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </motion.button>
        </div>

        {/* ── SEARCH BAR ── */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/60">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-neutral-900 border border-border rounded-2xl pl-10 pr-4 py-3 text-sm text-foreground placeholder-muted-foreground/50 outline-none focus:border-foreground/30 transition-colors shadow-sm"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-3 flex items-center text-muted-foreground/60 hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* ── EMPTY STATE ── */}
        {filteredNotes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#a29bfe] to-[#6c5ce7] flex items-center justify-center mb-5 shadow-xl">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="text-foreground font-black text-lg">{search ? 'No results' : 'No notes yet'}</p>
            <p className="text-muted-foreground text-sm mt-1.5 max-w-[220px] leading-relaxed">
              {search ? 'Try a different search term' : 'Tap + to capture your first idea'}
            </p>
            {!search && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditingNote('new')}
                className="mt-6 bg-gradient-to-br from-[#a29bfe] to-[#6c5ce7] text-white font-black text-sm uppercase tracking-widest px-7 py-3.5 rounded-2xl shadow-lg"
              >
                Create First Note
              </motion.button>
            )}
          </motion.div>
        )}

        {/* ── PINNED NOTES ── */}
        {pinnedNotes.length > 0 && (
          <div className="mb-5">
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 px-0.5">
              📌 Pinned
            </p>
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {pinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPin={handlePin}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* ── ALL NOTES ── */}
        {unpinnedNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest mb-3 px-0.5">
                All Notes
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence>
                {unpinnedNotes.map(note => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onPin={handlePin}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Note count */}
        {notes.length > 0 && (
          <p className="text-center text-muted-foreground/50 text-[11px] font-medium mt-6">
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* ── EDITOR MODAL ── */}
      <AnimatePresence>
        {editingNote !== null && (
          <NoteEditor
            note={editingNote === 'new' ? null : editingNote}
            onSave={handleSave}
            onClose={() => setEditingNote(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
