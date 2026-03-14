"use client"

import { useState } from "react"
import { NoteCard } from "./note-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { Note } from "@/lib/types/notes"

interface NotesGridProps {
  notes: Note[]
  viewMode: 'grid' | 'list'
  onUpdate: (note: Note) => void
  onDelete: (noteId: string) => void
}

export function NotesGrid({ notes, viewMode, onUpdate, onDelete }: NotesGridProps) {
  const pinnedNotes = notes.filter((note) => note.isPinned)
  const otherNotes = notes.filter((note) => !note.isPinned)

  if (notes.length === 0) {
    return (
      <div className="text-center py-20 bg-secondary/10 rounded-xl border-2 border-dashed border-border/50">
        <div className="space-y-4 max-w-xs mx-auto">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Search className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            No notes found
          </p>
        </div>
      </div>
    )
  }

  const Section = ({ title, items }: { title?: string, items: Note[] }) => (
    <div className="space-y-4">
      {title && items.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50 whitespace-nowrap">
            {title}
          </span>
          <div className="h-px bg-border/50 w-full" />
        </div>
      )}
      <div className={
        viewMode === 'grid' 
          ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
          : "flex flex-col gap-3"
      }>
        {items.map((note) => (
          <NoteCard 
            key={note.id} 
            note={note} 
            onDelete={onDelete} 
            onUpdate={onUpdate}
            viewMode={viewMode}
          />
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-12 pb-20">
      {pinnedNotes.length > 0 && (
        <Section title="Pinned" items={pinnedNotes} />
      )}
      <Section title={pinnedNotes.length > 0 ? "Others" : undefined} items={otherNotes} />
    </div>
  )
}
