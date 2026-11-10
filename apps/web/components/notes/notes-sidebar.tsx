"use client"

import { 
  StickyNote, 
  Pin, 
  Archive, 
  Hash, 
  Tag as TagIcon, 
  ChevronRight,
  FolderOpen
} from "lucide-react"

type FilterType = 'all' | 'pinned' | 'archived' | 'category' | 'tag'

interface NotesSidebarProps {
  activeFilter: { type: FilterType, value?: string }
  setActiveFilter: (filter: { type: FilterType, value?: string }) => void
  categories: string[]
  tags: string[]
  counts: {
    all: number
    pinned: number
    archived: number
  }
}

export function NotesSidebar({ activeFilter, setActiveFilter, categories, tags, counts }: NotesSidebarProps) {
  const NavItem = ({ 
    type, 
    value, 
    icon: Icon, 
    label, 
    count 
  }: { 
    type: FilterType, 
    value?: string, 
    icon: any, 
    label: string, 
    count?: number 
  }) => {
    const isActive = activeFilter.type === type && activeFilter.value === value
    
    return (
      <button
        onClick={() => setActiveFilter({ type, value })}
        className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg transition-all text-xs font-bold uppercase tracking-widest ${
          isActive 
            ? 'bg-secondary text-foreground shadow-sm' 
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary/70'}`} />
          <span>{label}</span>
        </div>
        {count !== undefined && count > 0 && (
          <span className={`text-[10px] tabular-nums font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground/60'}`}>
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="space-y-8 py-2">
      {/* Primary Views */}
      <div className="space-y-1">
        <NavItem type="all" icon={StickyNote} label="All Notes" count={counts.all} />
        <NavItem type="pinned" icon={Pin} label="Pinned" count={counts.pinned} />
        <NavItem type="archived" icon={Archive} label="Archive" count={counts.archived} />
      </div>

      {/* Categories */}
      {categories.length > 0 && (
        <div className="space-y-3">
          <div className="px-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Categories</h3>
            <FolderOpen className="w-3 h-3 text-muted-foreground/20" />
          </div>
          <div className="space-y-1">
            {categories.map(cat => (
              <NavItem 
                key={cat} 
                type="category" 
                value={cat} 
                icon={ChevronRight} 
                label={cat} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && (
        <div className="space-y-3">
          <div className="px-3 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">Popular Tags</h3>
            <TagIcon className="w-3 h-3 text-muted-foreground/20" />
          </div>
          <div className="flex flex-wrap gap-1.5 px-3">
            {tags.slice(0, 12).map(tag => {
              const isActive = activeFilter.type === 'tag' && activeFilter.value === tag
              return (
                <button
                  key={tag}
                  onClick={() => setActiveFilter({ type: 'tag', value: tag })}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold border transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                      : 'bg-background hover:border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  #{tag}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
