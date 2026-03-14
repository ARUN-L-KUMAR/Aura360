import { Logo } from "./ui/logo"

export function BrandingShowcase() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-12">
      <div className="flex flex-col items-center gap-4 p-8 glass-card rounded-3xl group">
        <Logo variant="orb" size="xl" className="mb-4" />
        <h3 className="font-bold text-lg">The Ethereal Orb</h3>
        <p className="text-xs text-muted-foreground text-center line-clamp-2">A soft, glowing sphere representing focus and holistic management.</p>
      </div>
      
      <div className="flex flex-col items-center gap-4 p-8 glass-card rounded-3xl group">
        <Logo variant="infinite" size="xl" className="mb-4" />
        <h3 className="font-bold text-lg">The Infinite Aura</h3>
        <p className="text-xs text-muted-foreground text-center line-clamp-2">A continuous loop forming an 'A', symbolizing 360-degree life sync.</p>
      </div>
      
      <div className="flex flex-col items-center gap-4 p-8 glass-card rounded-3xl group">
        <Logo variant="halo" size="xl" className="mb-4" />
        <h3 className="font-bold text-lg">The Minimalist Halo</h3>
        <p className="text-xs text-muted-foreground text-center line-clamp-2">Concentric rings representing layers of data and personal protection.</p>
      </div>
    </div>
  )
}
