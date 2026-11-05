"use client"

import { useState, useMemo } from "react"
import { NotesSidebar } from "./notes-sidebar"
import { NotesGrid } from "./notes-grid"
import { Search, Grid, List as ListIcon, Plus, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { CreateNoteDialog } from "./create-note-dialog"
import { ModuleHeader } from "@/components/ui/module-header"
import type { Note } from "@/lib/types/notes"

interface NotesClientManagerProps {
  initialNotes: Note[]
}

export function NotesClientManager({ initialNotes }: NotesClientManagerProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes)
  const [activeFilter, setActiveFilter] = useState<{ type: 'all' | 'pinned' | 'archived' | 'category' | 'tag', value?: string }>({ type: 'all' })
  const [searchQuery, setSearchQuery] = useState("")
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Derived data for sidebar
  const categories = useMemo(() => Array.from(new Set(notes.map(n => n.category).filter(Boolean))), [notes])
  const allTags = useMemo(() => Array.from(new Set(notes.flatMap(n => n.tags || []))), [notes])

  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      // Direct filters
      if (activeFilter.type === 'pinned' && !note.isPinned) return false
      if (activeFilter.type === 'archived' && !note.isArchived) return false
      if (activeFilter.type === 'all' && note.isArchived) return false // Hide archived in 'all' by default
      if (activeFilter.type === 'category' && note.category !== activeFilter.value) return false
      if (activeFilter.type === 'tag' && !note.tags?.includes(activeFilter.value as string)) return false

      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          note.title.toLowerCase().includes(query) ||
          note.content?.toLowerCase().includes(query) ||
          note.category?.toLowerCase().includes(query) ||
          note.tags?.some(tag => tag.toLowerCase().includes(query))
        )
      }

      return true
    })
  }, [notes, activeFilter, searchQuery])

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n))
  }

  const handleDeleteNote = (noteId: string) => {
    setNotes(prev => prev.filter(n => n.id !== noteId))
  }

  return (
    <div className="space-y-8">
      <ModuleHeader
        title="Workspace"
        description="A minimalist space for your thoughts"
        iconName="sticky-note"
        iconBgColor="bg-secondary/50"
        iconColor="text-slate-600 dark:text-slate-400"
      >
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="gap-2 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-[10px] h-11 px-6 shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Create Note
        </Button>
      </ModuleHeader>

      <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-12rem)] relative">
        {/* Sidebar - Collapsible */}
        <aside className={`transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-full md:w-64 opacity-100' : 'w-0 opacity-0 pointer-events-none'
        }`}>
          <NotesSidebar 
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            categories={categories as string[]}
            tags={allTags}
            counts={{
              all: notes.filter(n => !n.isArchived).length,
              pinned: notes.filter(n => n.isPinned).length,
              archived: notes.filter(n => n.isArchived).length,
            }}
          />
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex h-10 w-10 text-muted-foreground hover:text-primary transition-colors shrink-0"
                title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
              >
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
              </Button>

              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                <Input
                  placeholder="Search thoughts, ideas, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background border-muted h-10 text-sm shadow-none focus-visible:ring-primary/20"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-secondary/50 p-1 rounded-lg border h-10 self-end sm:self-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                title="List View"
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          <NotesGrid 
            notes={filteredNotes} 
            viewMode={viewMode}
            onUpdate={handleUpdateNote}
            onDelete={handleDeleteNote}
          />
        </main>

        <CreateNoteDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </div>
    </div>
  )
}
