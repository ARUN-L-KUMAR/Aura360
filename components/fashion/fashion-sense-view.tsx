"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Palette, Shirt, Calendar, Zap } from "lucide-react"

interface FashionItem {
  id: string
  user_id: string
  item_name: string
  category: string
  brand: string | null
  color: string | null
  size: string | null
  purchase_date: string | null
  price: number | null
  image_url: string | null
  buying_link: string | null
  notes: string | null
  type: "buyed" | "need_to_buy"
  status: string | null
  occasion: string[] | null
  season: string[] | null
  expected_budget: number | null
  buy_deadline: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

interface FashionSenseViewProps {
  wardrobeItems: FashionItem[]
}

export function FashionSenseView({ wardrobeItems }: FashionSenseViewProps) {
  const [selectedOccasion, setSelectedOccasion] = useState<string>("college")
  const [isGenerating, setIsGenerating] = useState(false)

  const occasions = ["college", "party", "work", "casual", "formal", "trip"]
  const seasons = ["summer", "winter", "spring", "autumn"]

  const generateOutfitSuggestion = async () => {
    setIsGenerating(true)
    // TODO: Implement AI outfit generation
    setTimeout(() => {
      setIsGenerating(false)
    }, 2000)
  }

  const generateColorCombinations = () => {
    // TODO: Implement color combination analysis
  }

  const getStylePrompt = () => {
    const prompts = [
      "Try pairing your white sneakers with dark jeans for a clean, modern look",
      "Mix patterns: stripes with florals can work if you keep colors coordinated",
      "Layering tip: A denim jacket over a graphic tee creates effortless style",
      "Color block: Navy and white never go out of style",
      "Accessorize: Add a belt to cinch your waist and elevate any outfit"
    ]
    return prompts[Math.floor(Math.random() * prompts.length)]
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Outfit Recommender */}
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shirt className="w-5 h-5" />
              Outfit Recommender
            </CardTitle>
            <CardDescription>
              Get AI-powered outfit suggestions based on your wardrobe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Occasion</label>
              <div className="flex flex-wrap gap-2">
                {occasions.map((occasion) => (
                  <Badge
                    key={occasion}
                    variant={selectedOccasion === occasion ? "default" : "outline"}
                    className="cursor-pointer capitalize"
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
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isGenerating ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Outfit
                </>
              )}
            </Button>
            {wardrobeItems.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Add items to your wardrobe first to get outfit suggestions.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Color Combinations */}
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Color Combinations
            </CardTitle>
            <CardDescription>
              Discover matching colors from your wardrobe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Base Color</label>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(wardrobeItems.map(item => item.color).filter(Boolean))).slice(0, 6).map((color) => (
                  <Badge key={color} variant="outline" className="capitalize">
                    {color}
                  </Badge>
                ))}
              </div>
            </div>
            <Button
              onClick={generateColorCombinations}
              disabled={wardrobeItems.length === 0}
              variant="outline"
              className="w-full"
            >
              <Palette className="w-4 h-4 mr-2" />
              Find Combinations
            </Button>
          </CardContent>
        </Card>

        {/* Daily Style Prompt */}
        <Card className="backdrop-blur-sm bg-card/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Style Prompt
            </CardTitle>
            <CardDescription>
              Daily fashion inspiration and tips
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg">
              <p className="text-sm italic">"{getStylePrompt()}"</p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
            >
              <Zap className="w-4 h-4 mr-2" />
              New Prompt
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Wardrobe Stats */}
      <Card className="backdrop-blur-sm bg-card/80">
        <CardHeader>
          <CardTitle>Wardrobe Overview</CardTitle>
          <CardDescription>
            Quick stats about your fashion collection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{wardrobeItems.length}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Array.from(new Set(wardrobeItems.map(item => item.category))).length}
              </div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600">
                {Array.from(new Set(wardrobeItems.map(item => item.color).filter(Boolean))).length}
              </div>
              <div className="text-sm text-muted-foreground">Colors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {wardrobeItems.filter(item => item.is_favorite).length}
              </div>
              <div className="text-sm text-muted-foreground">Favorites</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}