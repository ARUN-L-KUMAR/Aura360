/**
 * @deprecated Backward-compatibility re-export.
 *
 * All logic has moved to lib/ai/services/link-enricher.ts
 * which uses the shared GeminiClient with retry and timeout handling.
 *
 * New code should import from "@/lib/ai" or "@/lib/ai/services/link-enricher".
 */

export type {
  SuggestedModule,
  ProductEnrichment,
  InstagramEnrichment,
  YouTubeEnrichment,
  RecipeEnrichment,
  FitnessEnrichment,
  ArticleEnrichment,
  GenericEnrichment,
  LinkEnrichment,
  EnrichmentResult,
  LinkEnricherInput,
} from "@/lib/ai/services/link-enricher"

export { enrichLink } from "@/lib/ai/services/link-enricher"
