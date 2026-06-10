"use client";

import { useState, useTransition } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/hooks/use-app-toast";
import { addContactNote, deleteContactNote } from "@/actions/crm/contact-notes";

interface ContactNotesCardProps {
  contactId: string;
  initialNotes: string[];
}

export function ContactNotesCard({ contactId, initialNotes }: ContactNotesCardProps) {
  const [notes, setNotes] = useState<string[]>(initialNotes);
  const [newNote, setNewNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const { toast } = useAppToast();

  const handleAdd = () => {
    const trimmed = newNote.trim();
    if (!trimmed) return;

    startTransition(async () => {
      const result = await addContactNote({ contactId, note: trimmed });
      if (result.success) {
        setNotes(result.data?.notes ?? []);
        setNewNote("");
      } else {
        toast.error("Failed to add note", { description: result.error, isTranslationKey: false });
      }
    });
  };

  const handleDelete = (index: number) => {
    startTransition(async () => {
      const result = await deleteContactNote({ contactId, noteIndex: index });
      if (result.success) {
        setNotes(result.data?.notes ?? []);
      } else {
        toast.error("Failed to delete note", { description: result.error, isTranslationKey: false });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet.</p>
          ) : (
            notes.map((note, index) => (
              <div
                key={`note-${index}`}
                className="flex items-start justify-between gap-2 rounded-md border p-3"
              >
                <p className="text-sm text-muted-foreground flex-1 whitespace-pre-wrap">{note}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(index)}
                  disabled={isPending}
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <Textarea
            placeholder="Add a note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={3}
            disabled={isPending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                handleAdd();
              }
            }}
          />
          <Button
            size="sm"
            onClick={handleAdd}
            disabled={isPending || !newNote.trim()}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
            ) : (
              <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            )}
            Add Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
