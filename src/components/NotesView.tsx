'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSupabase, type Note } from '@/lib/SupabaseContext';
import { LayoutGrid, Heart, Circle, CheckCircle2, Mic, Plus, MoreHorizontal, FileText, Pin, Trash2, Pen } from 'lucide-react';

const NOTE_COLORS = [
  { id: 'mint',     bg: 'bg-card-mint text-black',            icon: <Pin className="w-4 h-4 opacity-50"/> },
  { id: 'orange',   bg: 'bg-card-orange text-black',          icon: <LayoutGrid className="w-4 h-4 opacity-50"/> },
  { id: 'yellow',   bg: 'bg-card-yellow text-black',          icon: <FileText className="w-4 h-4 opacity-50"/> },
  { id: 'cream',    bg: 'bg-card-cream text-black',           icon: <MoreHorizontal className="w-4 h-4 opacity-50"/> },
  { id: 'purple',   bg: 'bg-card-purple text-black',          icon: <LayoutGrid className="w-4 h-4 opacity-50"/> },
];

function getColor(id: string) {
  return NOTE_COLORS.find(c => c.id === id) ?? NOTE_COLORS[0];
}

function NoteCard({
  note, onEdit, onDelete, onPin,
}: {
  note: Note;
  onEdit: (note: Note) => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const colorConfig = getColor(note.color);
  const ref = useRef<HTMLDivElement>(null);

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
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-[32px] p-6 cursor-pointer ${colorConfig.bg} flex flex-col justify-between min-h-[180px] shadow-sm select-none`}
      onClick={() => onEdit(note)}
    >
      <div>
        <div className="flex justify-between items-start gap-1 mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="font-medium text-2xl leading-tight line-clamp-2">{note.title || 'Untitled'}</h4>
            {note.pinned && <span className="text-xs font-semibold uppercase tracking-wider block mt-1 opacity-70 flex items-center gap-1"><Pin className="w-3 h-3"/> Pinned</span>}
          </div>
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center flex-shrink-0 text-black/60 hover:text-black transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {note.content && (
          <div className="mt-4 space-y-2 opacity-80">
            {note.content.split('\n').slice(0, 3).map((line, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                {line.startsWith('- [x]') || line.startsWith('x ') ? (
                  <CheckCircle2 className="w-4 h-4 text-black/60 flex-shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-black/40 flex-shrink-0" />
                )}
                <span className="truncate font-medium">{line.replace(/^-\s\[x\]\s|^-\s\[\s\]\s|^x\s/, '')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between opacity-60 text-xs font-medium">
        <span>Update {timeStr}</span>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            onClick={e => e.stopPropagation()}
            className="absolute top-12 right-4 z-20 w-36 bg-black rounded-2xl shadow-xl border border-black/10 dark:border-white/10 overflow-hidden text-foreground"
          >
            <button
              onClick={() => { onPin(note.id, !note.pinned); setMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Pin className="w-4 h-4"/> {note.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              onClick={() => { onEdit(note); setMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium hover:bg-black/10 dark:hover:bg-white/10"
            >
              <Pen className="w-4 h-4"/> Edit
            </button>
            <button
              onClick={() => { onDelete(note.id); setMenuOpen(false); }}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10"
            >
              <Trash2 className="w-4 h-4"/> Delete
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function NoteEditor({
  note, onSave, onClose,
}: {
  note: Partial<Note> | null;
  onSave: (title: string, content: string, color: string) => Promise<void>;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(note?.title ?? '');
  const [content, setContent] = useState(note?.content ?? '');
  const [color, setColor] = useState(note?.color ?? 'mint');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) { onClose(); return; }
    setSaving(true);
    await onSave(title.trim(), content.trim(), color);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full sm:max-w-md bg-[#111] sm:rounded-[40px] rounded-t-[40px] p-6 space-y-4 shadow-2xl h-[85vh] sm:h-auto flex flex-col border border-black/10 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-xl text-foreground">{note?.id ? 'Edit Note' : 'New Note'}</h3>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-black/10 dark:bg-white/10 text-foreground flex items-center justify-center">
            <Plus className="w-5 h-5 rotate-45" />
          </button>
        </div>

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-transparent text-foreground font-medium text-3xl placeholder-white/30 outline-none"
        />

        <textarea
          placeholder="Start writing..."
          value={content}
          onChange={e => setContent(e.target.value)}
          className="w-full flex-1 bg-transparent text-black/80 dark:text-white/80 text-lg leading-relaxed font-medium outline-none resize-none placeholder-white/20 mt-4"
        />

        <div className="flex items-center gap-3 pt-4 pb-2">
          {NOTE_COLORS.map(c => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={`w-10 h-10 rounded-full ${c.bg} ${color === c.id ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111] scale-110' : 'opacity-80'} transition-all`}
            />
          ))}
        </div>

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving} className="w-full bg-white text-black py-4 rounded-[24px] font-semibold text-lg hover:bg-white/90 transition-colors">
            {saving ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function NotesView() {
  const { profile, notes, addNote, updateNote, deleteNote } = useSupabase();
  const [editingNote, setEditingNote] = useState<Partial<Note> | 'new' | null>(null);
  const [activeTab, setActiveTab] = useState('All');

  if (!profile) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen bg-background">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const filtered = notes.filter(n => {
    if (activeTab === 'Important') return n.pinned;
    return true;
  });

  const handleSave = async (title: string, content: string, color: string) => {
    if (editingNote && editingNote !== 'new' && (editingNote as Note).id) {
      await updateNote((editingNote as Note).id, { title, content, color });
    } else {
      await addNote(title, content, color);
    }
    setEditingNote(null);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-32 select-none relative font-sans">
      <div className="max-w-md mx-auto px-6 pt-12 space-y-8">

        {/* ── HEADER ── */}
        <div className="flex justify-between items-start">
          <h1 className="text-5xl font-medium leading-[1.1] tracking-tight">
            My<br/>Notes
          </h1>
          <button
            onClick={() => setEditingNote('new')}
            className="w-12 h-12 rounded-full bg-white text-black border border-black/5 dark:border-transparent flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 -mx-6 px-6 no-scrollbar">
          <button
            onClick={() => setActiveTab('All')}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full border transition-all text-sm font-medium ${
              activeTab === 'All' ? 'border-white text-foreground' : 'border-white/20 text-black/50 dark:text-white/50'
            }`}
          >
            All <span className="ml-1 opacity-50 text-[10px] bg-white/20 px-2 py-0.5 rounded-full">{notes.length}</span>
          </button>
          <button
            onClick={() => setActiveTab('Important')}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full border transition-all text-sm font-medium ${
              activeTab === 'Important' ? 'border-white text-foreground' : 'border-white/20 text-black/50 dark:text-white/50'
            }`}
          >
            Important
          </button>
          <button
            onClick={() => setActiveTab('To-do')}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full border transition-all text-sm font-medium ${
              activeTab === 'To-do' ? 'border-white text-foreground' : 'border-white/20 text-black/50 dark:text-white/50'
            }`}
          >
            To-do
          </button>
        </div>

        {/* ── NOTES GRID ── */}
        <div className="grid grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-2 bg-black/5 dark:bg-white/5 rounded-[40px] p-12 text-center border border-white/5">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium text-black/70 dark:text-white/70">No notes here</p>
              <p className="text-sm text-black/40 dark:text-white/40 mt-1">Tap + to add one</p>
            </div>
          ) : (
            filtered.map(n => (
              <NoteCard
                key={n.id}
                note={n}
                onEdit={note => setEditingNote(note)}
                onDelete={id => deleteNote(id)}
                onPin={(id, p) => updateNote(id, { pinned: p })}
              />
            ))
          )}
        </div>
      </div>


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
