"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Palette, Shirt, Zap, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"
import type { FashionItem } from "@/lib/types/fashion"
import { toast } from "sonner"
import Image from "next/image"

interface FashionSenseViewProps {
  wardrobeItems: FashionItem[]
}

export function FashionSenseView({ wardrobeItems }: FashionSenseViewProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<string>("college")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedOutfits, setGeneratedOutfits] = useState<any[]>([])
  const [colorInsights, setColorInsights] = useState<{ base: string; pairs: string[]; advice: string }[] | null>(null)

  const occasions = ["college", "party", "work", "casual", "formal", "trip"]

  const generateOutfitSuggestion = async () => {
    if (wardrobeItems.length === 0) {
      toast.error("Add items to your wardrobe first to generate outfits.")
      return
    }

    setIsGenerating(true)
    try {
      const res = await fetch("/api/fashion/ai-designer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_outfits",
          params: {
            occasion: selectedOccasion,
            vibe: selectedOccasion === "formal" ? "Refined Classic" : "Smart Minimalist",
            season: "All Seasons",
          },
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.message || data.error || "Failed to generate outfits")
      }

      setGeneratedOutfits(data.outfits || [])
      toast.success(`Generated ${data.outfits?.length || 0} outfit combinations!`)
    } catch (err: any) {
      console.error("[FashionSenseView error]:", err)
      toast.error(err.message || "Failed to generate outfits. Please check AI configuration.")
    } finally {
      setIsGenerating(false)
    }
  }

  const generateColorCombinations = () => {
    const colors = Array.from(new Set(wardrobeItems.map(item => item.color?.toLowerCase().trim()).filter(Boolean))) as string[]

    if (colors.length === 0) {
      toast.error("Add colors to your wardrobe items to analyze color combinations.")
      return
    }

    // Palette relationship rules
    const harmonyMap: Record<string, { matches: string[]; advice: string }> = {
      black: { matches: ["White", "Beige", "Grey", "Denim", "Camel"], advice: "Universal neutral; great for high contrast." },
      white: { matches: ["Navy", "Olive", "Black", "Charcoal", "Earth Tones"], advice: "Clean canvas; pairs with rich saturated tones." },
      navy: { matches: ["White", "Camel", "Burgundy", "Grey", "Tan"], advice: "Sophisticated alternative to black with warmth." },
      grey: { matches: ["White", "Navy", "Pastels", "Burgundy", "Black"], advice: "Soft bridge between high-contrast tones." },
      blue: { matches: ["White", "Khaki", "Brown", "Cream", "Rust"], advice: "Classic denim-friendly harmony." },
      olive: { matches: ["Black", "White", "Tan", "Rust", "Cream"], advice: "Grounded earthy neutral with casual utility." },
      beige: { matches: ["Navy", "White", "Forest Green", "Brown", "Black"], advice: "Warm neutral that flatters soft lighting." },
    }

    const insights = colors.slice(0, 4).map(c => {
      const found = harmonyMap[c] || {
        matches: ["Neutral White", "Black", "Soft Grey"],
        advice: "Pair with monochromatic shades or balanced neutrals.",
      }
      return {
        base: c.charAt(0).toUpperCase() + c.slice(1),
        pairs: found.matches,
        advice: found.advice,
      }
    })

    setColorInsights(insights)
    toast.success("Color combination analysis ready!")
  }

  const getStylePrompt = () => {
    const prompts = [
      "Try pairing clean white sneakers with dark tapered jeans for an effortless, modern baseline.",
      "Mix textures: ribbed knit with structured denim creates immediate tactile interest.",
      "Rule of thirds: tuck in your top or add a cropped jacket to elongate your leg line.",
      "Monochromatic layering: wearing varying shades of the same color palette looks instantly high-end.",
      "Accent accessory: a leather belt or minimalist watch grounds any casual outfit.",
    ]
    return prompts[Math.floor(Math.random() * prompts.length)]
  }

  // Helper to find item details by id
  const getItemById = (id: string) => wardrobeItems.find(i => i.id === id)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Outfit Recommender */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="w-5 h-5 text-indigo-500" />
              Outfit Recommender
            </CardTitle>
            <CardDescription>
              Get AI-powered outfit suggestions tailored to your wardrobe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Occasion</label>
              <div className="flex flex-wrap gap-2">
                {occasions.map((occasion) => (
                  <Badge
                    key={occasion}
                    variant={selectedOccasion === occasion ? "default" : "outline"}
                    className="cursor-pointer capitalize text-xs"
                    onClick={() => setSelectedOccasion(occasion)}
                  >
                    {occasion}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              onClick={generateOutfitSuggestion}
              disabled={isGenerating || wardrobeItems.length === 0}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 font-bold uppercase tracking-wider text-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Styling Lookbook...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Outfit
                </>
              )}
            </Button>
            {wardrobeItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add items to your wardrobe first to unlock outfit recommendations.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Color Combinations */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5 text-purple-500" />
              Color Combinations
            </CardTitle>
            <CardDescription>
              Discover matching color theories from your pieces
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Detected Colors</label>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(new Set(wardrobeItems.map(item => item.color).filter(Boolean))).slice(0, 6).map((color) => (
                  <Badge key={color} variant="outline" className="capitalize text-xs">
                    {color}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              onClick={generateColorCombinations}
              disabled={wardrobeItems.length === 0}
              variant="outline"
              className="w-full font-bold uppercase tracking-wider text-xs"
            >
              <Palette className="w-4 h-4 mr-2 text-purple-500" />
              Analyze Harmonies
            </Button>
          </CardContent>
        </Card>

        {/* Daily Style Prompt */}
        <Card className="backdrop-blur-sm bg-card/80 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Style Directives
            </CardTitle>
            <CardDescription>
              Daily fashion inspiration and editorial tips
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
              <p className="text-xs italic leading-relaxed text-foreground">"{getStylePrompt()}"</p>
            </div>
            <Button
              onClick={() => {
                toast.info("Directive refreshed!")
              }}
              variant="outline"
              className="w-full font-bold uppercase tracking-wider text-xs"
            >
              <Zap className="w-4 h-4 mr-2 text-amber-500" />
              Next Directive
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Generated AI Outfits Section */}
      {generatedOutfits.length > 0 && (
        <div className="space-y-4 animate-in fade-in duration-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Curated Outfits ({generatedOutfits.length})
              </h3>
              <p className="text-xs text-muted-foreground">Generated specifically for {selectedOccasion} aesthetic</p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {generatedOutfits.map((outfit: any, idx: number) => (
              <Card key={outfit.id || idx} className="overflow-hidden border-primary/20 bg-card/90 shadow-md">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 to-purple-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-bold">{outfit.name}</CardTitle>
                    <Badge variant="secondary" className="capitalize text-[10px] font-bold">
                      {outfit.vibe || selectedOccasion}
                    </Badge>
                  </div>
                  {outfit.whyItWorks && (
                    <CardDescription className="text-xs line-clamp-2 mt-1">{outfit.whyItWorks}</CardDescription>
                  )}
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Outfit Items Thumbnails */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Included Pieces</span>
                    <div className="grid grid-cols-3 gap-2">
                      {outfit.itemIds?.map((id: string) => {
                        const item = getItemById(id)
                        if (!item) return null
                        return (
                          <div key={id} className="relative rounded-lg border bg-secondary/30 p-2 text-center group">
                            {item.imageUrl ? (
                              <div className="relative w-full h-16 rounded mb-1 overflow-hidden">
                                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                              </div>
                            ) : (
                              <div className="w-full h-16 rounded bg-primary/10 flex items-center justify-center mb-1">
                                <Shirt className="w-6 h-6 text-primary" />
                              </div>
                            )}
                            <p className="text-[10px] font-semibold truncate">{item.name}</p>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Styling Tips */}
                  {outfit.stylingTips && (
                    <div className="p-3 rounded-lg bg-secondary/50 border text-xs text-muted-foreground space-y-1">
                      <span className="font-bold text-foreground text-[10px] uppercase tracking-wider block">Styling Tip:</span>
                      <p className="text-xs leading-relaxed">{outfit.stylingTips}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Color Combinations Analysis Output */}
      {colorInsights && (
        <Card className="border-border animate-in fade-in duration-300">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Palette className="w-4 h-4 text-purple-500" />
              Color Harmony Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              Curated pairings based on color theory for your pieces
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {colorInsights.map((ci) => (
                <div key={ci.base} className="p-4 rounded-xl border bg-secondary/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{ci.base}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {ci.pairs.map((p) => (
                      <Badge key={p} variant="secondary" className="text-[10px]">
                        + {p}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug pt-1">{ci.advice}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wardrobe Stats */}
      <Card className="backdrop-blur-sm bg-card/80 border-border">
        <CardHeader>
          <CardTitle className="text-base font-bold">Wardrobe Telemetry</CardTitle>
          <CardDescription className="text-xs">
            Summary metrics of your registered collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            <div className="text-center p-3 rounded-lg bg-secondary/20">
              <div className="text-2xl font-bold text-indigo-600">{wardrobeItems.length}</div>
              <div className="text-xs font-semibold text-muted-foreground">Total Pieces</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/20">
              <div className="text-2xl font-bold text-purple-600">
                {Array.from(new Set(wardrobeItems.map(item => item.category))).length}
              </div>
              <div className="text-xs font-semibold text-muted-foreground">Categories</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/20">
              <div className="text-2xl font-bold text-pink-600">
                {Array.from(new Set(wardrobeItems.map(item => item.color).filter(Boolean))).length}
              </div>
              <div className="text-xs font-semibold text-muted-foreground">Palettes</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-secondary/20">
              <div className="text-2xl font-bold text-emerald-600">
                {wardrobeItems.filter(item => item.isFavorite).length}
              </div>
              <div className="text-xs font-semibold text-muted-foreground">Starred Looks</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
