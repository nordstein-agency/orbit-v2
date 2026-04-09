'use client';

import { useState, useEffect } from 'react';
import { Lead, Profile, Note } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { X, Pencil, Trash2, Plus } from 'lucide-react';

interface Props {
  lead: Lead;
  currentProfile: Profile | null;
  onClose: () => void;
  onSaved: (updated: Lead) => void;
}

export default function NoteModal({ lead, currentProfile, onClose, onSaved }: Props) {
  const [notes, setNotes] = useState<Note[]>(lead.notes || []);
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function addNote() {
    if (!newNote.trim() || !currentProfile) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('notes')
      .insert({ lead_id: lead.id, content: newNote.trim(), created_by: currentProfile.id })
      .select()
      .single();
    if (!error && data) {
      const updated = [...notes, data as Note];
      setNotes(updated);
      setNewNote('');
      onSaved({ ...lead, notes: updated });
      // Log
      await supabase.from('activity_log').insert({
        lead_id: lead.id, user_id: currentProfile.id, type: 'note_added',
        metadata: { lead_name: lead.name },
      });
    }
    setSaving(false);
  }

  async function saveEdit(noteId: string) {
    if (!editContent.trim()) return;
    const { data, error } = await supabase
      .from('notes')
      .update({ content: editContent.trim(), updated_at: new Date().toISOString() })
      .eq('id', noteId)
      .select()
      .single();
    if (!error && data) {
      const updated = notes.map(n => n.id === noteId ? data as Note : n);
      setNotes(updated);
      setEditingId(null);
      onSaved({ ...lead, notes: updated });
      await supabase.from('activity_log').insert({
        lead_id: lead.id, user_id: currentProfile?.id, type: 'note_edited',
        metadata: { lead_name: lead.name },
      });
    }
  }

  async function deleteNote(noteId: string) {
    if (!confirm('Notiz löschen?')) return;
    await supabase.from('notes').update({ deleted_at: new Date().toISOString() }).eq('id', noteId);
    const updated = notes.filter(n => n.id !== noteId);
    setNotes(updated);
    onSaved({ ...lead, notes: updated });
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Notizen</h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{lead.name}</p>
          </div>
          <button className="btn-icon btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Add note */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="label">Neue Notiz</label>
            <textarea
              className="textarea"
              rows={3}
              placeholder="Notiz eingeben..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}
            />
            <button className="btn btn-primary btn-sm" onClick={addNote} disabled={saving || !newNote.trim()}>
              <Plus size={14} />
              {saving ? 'Speichern…' : 'Notiz hinzufügen'}
            </button>
          </div>

          {/* Existing notes */}
          {notes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <label className="label">{notes.length} {notes.length === 1 ? 'Notiz' : 'Notizen'}</label>
              {[...notes].reverse().map(note => (
                <div key={note.id} style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '12px', position: 'relative' }}>
                  {editingId === note.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <textarea
                        className="textarea"
                        rows={3}
                        value={editContent}
                        onChange={e => setEditContent(e.target.value)}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(note.id)}>Speichern</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingId(null)}>Abbrechen</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.83rem', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap', paddingRight: '60px' }}>{note.content}</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: '6px' }}>
                        {new Date(note.created_at).toLocaleDateString('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '4px' }}>
                        <button className="btn-icon btn" style={{ width: 28, height: 28 }} onClick={() => { setEditingId(note.id); setEditContent(note.content); }}>
                          <Pencil size={12} />
                        </button>
                        {(currentProfile?.role === 'admin' || note.created_by === currentProfile?.id) && (
                          <button className="btn-icon btn" style={{ width: 28, height: 28, color: '#dc2626' }} onClick={() => deleteNote(note.id)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {notes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-subtle)', fontSize: '0.83rem' }}>
              Noch keine Notizen vorhanden
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
