"use client"

import { useState } from "react"
import { NoteCard } from "./note-card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

interface Note {
  id: string
  user_id: string
  title: string
  content: string | null
  category: string | null
  tags: string[] | null
  is_pinned: boolean
  created_at: string
  updated_at: string
}

interface NotesGridProps {
  initialNotes: Note[]
}

export function NotesGrid({ initialNotes }: NotesGridProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [searchQuery, setSearchQuery] = useState("")

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.category?.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const handleNoteDeleted = (noteId: string) => {
    setNotes((prev) => prev.filter((note) => note.id !== noteId))
  }

  const handleNoteUpdated = (updatedNote: Note) => {
    setNotes((prev) => prev.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-card/80 backdrop-blur-sm"
        />
      </div>

      {filteredNotes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery ? "No notes found matching your search." : "No notes yet. Create your first note!"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredNotes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleNoteDeleted} onUpdate={handleNoteUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}
