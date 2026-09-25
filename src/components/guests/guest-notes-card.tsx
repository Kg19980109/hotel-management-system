"use client";

import * as React from "react";
import { GuestNote } from "@/lib/guests/types";
import { addGuestNoteAction, deleteGuestNoteAction } from "@/lib/guests/actions";
import { Button } from "@/components/ui/button";
import { FileText, Pin, Trash2, Send } from "lucide-react";

interface GuestNotesCardProps {
  propertyId: string;
  guestId: string;
  notes: GuestNote[];
  onNotesChanged: () => void;
  canManage?: boolean;
}

export function GuestNotesCard({
  propertyId,
  guestId,
  notes,
  onNotesChanged,
  canManage = true,
}: GuestNotesCardProps) {
  const [newNote, setNewNote] = React.useState("");
  const [isPinned, setIsPinned] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await addGuestNoteAction(propertyId, guestId, newNote, isPinned);
      if (!res.success) {
        setError(res.error || "Failed to add note.");
        return;
      }
      setNewNote("");
      setIsPinned(false);
      onNotesChanged();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteGuestNoteAction(propertyId, guestId, noteId);
      onNotesChanged();
    } catch (err) {
      console.error("Delete note error:", err);
    }
  };

  return (
    <div className="p-5 bg-white rounded-[var(--radius-xl)] border border-[var(--border)] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="font-semibold text-sm text-[var(--foreground)]">Internal Staff Notes</h3>
        </div>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
          Hotel Staff Only • Never Customer-Facing
        </span>
      </div>

      {canManage && (
        <form onSubmit={handleAddNote} className="space-y-2">
          {error && (
            <div className="p-2 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          <div className="relative">
            <textarea
              rows={2}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add an internal operational note (e.g. VIP guest, requested late checkout courtesy)..."
              required
              className="w-full text-xs rounded-[var(--radius-lg)] border border-[var(--border)] p-3 focus:outline-none focus:ring-1 focus:ring-[var(--primary)] bg-slate-50/50"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <Pin className="h-3 w-3 text-amber-600" />
              <span>Pin to top</span>
            </label>

            <Button
              type="submit"
              size="sm"
              disabled={submitting || !newNote.trim()}
              className="text-xs h-7 px-3 bg-[var(--primary)] text-white gap-1"
            >
              <Send className="h-3 w-3" />
              <span>{submitting ? "Posting..." : "Post Note"}</span>
            </Button>
          </div>
        </form>
      )}

      {/* Notes Stream */}
      <div className="space-y-2.5 pt-2">
        {notes.length > 0 ? (
          notes.map((note) => (
            <div
              key={note.id}
              className={`p-3.5 rounded-[var(--radius-lg)] border text-xs space-y-1.5 transition-colors ${
                note.is_pinned
                  ? "bg-amber-50/60 border-amber-200"
                  : "bg-slate-50/50 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  {note.is_pinned && (
                    <span className="inline-flex items-center gap-0.5 text-amber-800 font-semibold text-[10px] bg-amber-100 px-1.5 py-0.5 rounded">
                      <Pin className="h-2.5 w-2.5" />
                      Pinned
                    </span>
                  )}
                  <span>{new Date(note.created_at).toLocaleString()}</span>
                </div>

                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600"
                    title="Delete note"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>

              <p className="text-slate-800 whitespace-pre-wrap leading-relaxed">{note.note}</p>
            </div>
          ))
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50/50 rounded-[var(--radius-lg)] border border-dashed border-slate-200">
            No internal staff notes recorded for this guest.
          </div>
        )}
      </div>
    </div>
  );
}
