/**
 * Decides where a shopping link belongs and what to call it. Pure (no imports), so it can be run on its own.
 *
 *  - Clothes, footwear and wearable accessories -> the Fashion wishlist, with a Fashion category (tops, dresses, ...).
 *  - Everything else (electronics, appliances, home, books ...) -> Saved, with one of SAVED_PRODUCT_CATEGORIES.
 *
 * Product titles read "<brand> <details> <what it is> [for/with ...]", so the noun that names the product is the LAST
 * keyword of the part before "for", "with", "-", "," or "(". "Roadster Table Tennis T-shirt" is a shirt, not a table, and
 * "Shoe Rack for Home" is furniture, not a shoe. When the title says nothing, the shop's own category, the AI's guess and
 * the shop itself (Myntra and Ajio sell clothes) break the tie.
 */

export const SAVED_PRODUCT_CATEGORIES = [
  'Electronics',
  'Appliances',
  'Home & Kitchen',
  'Furniture',
  'Books',
  'Beauty & Care',
  'Health & Fitness',
  'Toys & Baby',
  'Grocery',
  'Sports & Outdoors',
  'Automotive',
  'Stationery',
  'Other',
] as const;

export type SavedProductCategory = (typeof SAVED_PRODUCT_CATEGORIES)[number];

export type ProductClassification =
  | { module: 'fashion'; category: string }
  | { module: 'saved'; category: SavedProductCategory };

export type ClassifyInput = {
  title: string;
  description?: string | null;
  /** The shop's own category as the product scraper reads it: "tops", "shoes", ... or "general" when it could not tell. */
  scrapedCategory?: string | null;
  /** What the AI guessed: its module and its free-text product category. */
  aiModule?: string | null;
  aiCategory?: string | null;
  /** "amazon" | "flipkart" | "myntra" | "ajio" | "meesho" | "nykaa" | "other" */
  store?: string | null;
};

const FASHION_CATEGORY_RULES: Array<[string, RegExp]> = [
  ['shoes', /sneaker|shoe|sandal|slipper|flip.?flop|heels?\b|loafer|boots?\b|footwear|sliders?\b|crocs/],
  ['bottoms', /jeans|trouser|pants?\b|chinos?\b|jogger|legging|skirt|shorts\b|palazzo|cargo|track.?pant|dhoti|salwar/],
  ['dresses', /dress|gown|jumpsuit|saree|sari|lehenga|kurta|kurti|co-?ords?\b|anarkali|sharara/],
  ['outerwear', /jacket|coat|blazer|hoodie|sweatshirt|sweater|cardigan|shrug|pullover|waistcoat|windcheater/],
  ['tops', /t-?shirts?\b|shirt|\btops?\b|\btee\b|blouse|polo|tank|tunic|kurta set|vest\b/],
  [
    'accessories',
    /handbag|backpack|\bbags?\b|wallet|belt|wrist.?watch|analog watch|sunglass|\bcaps?\b|\bhats?\b|scarf|stole|dupatta|jewel|earring|necklace|bracelet|\brings?\b|\bties?\b|clutch|sling|socks|bangle|anklet|pendant/,
  ],
];

/** The Fashion category for a piece of text ("shoes", "bottoms", "dresses", "outerwear", "tops", "accessories") or "general". */
export function fashionCategoryOf(text: string): string {
  const head = headOf(text).toLowerCase();
  const found = lastMatch(head, FASHION_CATEGORY_RULES.map(([name, pattern]) => ({ name, pattern })));
  if (found) return found.name;
  for (const [name, pattern] of FASHION_CATEGORY_RULES) if (pattern.test(text.toLowerCase())) return name;
  return 'general';
}

const NON_FASHION_RULES: Array<[SavedProductCategory, RegExp]> = [
  [
    'Electronics',
    /smart.?watch|fitness (?:band|tracker)|apple watch|phones?\b|smartphone|mobile\b|laptop|notebook pc|tablet|ipad|headphone|earphone|earbuds?\b|airpods?|neckband|speaker|soundbar|\btvs?\b|television|camera|gopro|monitor|keyboard|\bmouse\b|charger|power ?bank|usb|cable|router|printer|ssd\b|hard (?:disk|drive)|pen ?drive|memory card|gaming|console|playstation|xbox|bluetooth|projector|drone|smart (?:home|bulb|plug)|webcam|microphone/,
  ],
  [
    'Appliances',
    /refrigerator|fridge|washing machine|air conditioner|\bacs?\b|microwave|\boven\b|mixer|grinder|juicer|blender|air.?fryer|induction|cooktop|chimney|water purifier|geyser|water heater|vacuum cleaner|steam iron|dry iron|\bfans?\b|cooler|room heater|dishwasher|toaster|kettle|rice cooker|sandwich maker|food processor|humidifier|air purifier|inverter|stabilizer|hair dryer|straightener/,
  ],
  [
    'Furniture',
    /sofa|couch|\bchairs?\b|\btables?\b|\bdesk\b|\bbeds?\b|wardrobe|shelf|shelves|bookcase|stool|recliner|\bracks?\b|cupboard|cabinet|dining set|bean bag|ottoman|shoe rack/,
  ],
  [
    'Home & Kitchen',
    /bedsheet|bed sheet|curtain|pillow|mattress|cookware|utensil|bottle|lunch ?box|container|storage|towel|\brugs?\b|carpet|cushion|lamp|decor|dinner set|\bmugs?\b|plates?\b|casserole|vase|organi[sz]er|broom|\bmop\b|kitchen|frying pan|\bpans?\b|cooker|tiffin|flask|hanger|clock|candle|doormat|blanket|comforter|quilt|wall art|bucket|dustbin/,
  ],
  ['Books', /\bbooks?\b|paperback|hardcover|novel|kindle|textbook|guide book|workbook/],
  [
    'Beauty & Care',
    /lipstick|foundation|serum|moisturi[sz]er|sunscreen|shampoo|conditioner|face ?wash|perfume|deodorant|fragrance|make.?up|kajal|mascara|nail polish|lotion|face cream|body wash|skincare|skin care|\btrimmer\b|razor|shaving|face mask|toner|eyeliner|lip balm|hair oil|hair color|body butter|beard/,
  ],
  [
    'Health & Fitness',
    /protein|whey|dumbbell|yoga mat|supplement|vitamin|treadmill|resistance band|multivitamin|massager|\bgym\b|kettlebell|skipping rope|health drink|bp monitor|glucometer|thermometer|pulse oximeter|creatine|pre.?workout/,
  ],
  ['Toys & Baby', /\btoys?\b|lego|puzzle|\bdolls?\b|diapers?\b|\bbaby\b|stroller|action figure|board game|soft toy|teddy|rattle|kids? (?:cycle|bicycle)/],
  [
    'Grocery',
    /\btea\b|coffee|snacks?\b|chocolate|biscuit|masala|spices?\b|dry fruits?|almonds?|cashew|honey|\batta\b|basmati|\bghee\b|\bdal\b|noodles|oats|cereal|jam\b|sauce|pickle|ketchup/,
  ],
  [
    'Sports & Outdoors',
    /cricket|\bbats?\b|football|badminton|racket|racquet|\bcycle\b|bicycle|\btent\b|trekking|camping|skates?\b|carrom|chess|swimming|shuttle|hockey|tennis ball|boxing/,
  ],
  ['Automotive', /\bhelmet|\bcars?\b|\bbike\b|motorcycle|\btyres?\b|\btires?\b|dash.?cam|engine oil|seat cover|car (?:cover|polish|vacuum)|wiper|horn\b/],
  ['Stationery', /\bpens?\b|notebook|diary|planner|marker|stapler|highlighter|sketch ?pens?|art supplies|paint(?:s|ing)? set|geometry box|sticky notes/],
];

type Match<T> = { name: T; end: number; length: number };

/** The head of a title: everything before "for", "with", "-", "|", "," or "(" (with the whole title as a fallback). */
function headOf(title: string): string {
  const cleaned = title.replace(/\s+/g, ' ').trim();
  const cut = cleaned.search(/\s(?:for|with|without|combo of|pack of)\s|\s[-–|]\s|,|\(/i);
  const head = cut > 3 ? cleaned.slice(0, cut) : cleaned;
  return head.trim();
}

/** Of all the rules, the one whose match ends last in the text; on a tie, the longer (more specific) match. */
function lastMatch<T>(text: string, rules: Array<{ name: T; pattern: RegExp }>): Match<T> | null {
  let best: Match<T> | null = null;
  for (const { name, pattern } of rules) {
    const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
    const all = new RegExp(pattern.source, flags);
    for (const found of text.matchAll(all)) {
      if (found[0].length === 0) continue;
      const end = (found.index ?? 0) + found[0].length;
      if (!best || end > best.end || (end === best.end && found[0].length > best.length)) best = { name, end, length: found[0].length };
    }
  }
  return best;
}

/** Maps free text ("Mobile Phones", "Kitchen & Dining") to one of our categories, or null if it names none. */
export function savedCategoryOf(text: string | null | undefined): SavedProductCategory | null {
  if (!text) return null;
  const found = lastMatch(
    text.toLowerCase(),
    NON_FASHION_RULES.map(([name, pattern]) => ({ name, pattern })),
  );
  return found?.name ?? null;
}

const FASHION_SHOPS = new Set(['myntra', 'ajio']);

export function classifyProduct(input: ClassifyInput): ProductClassification {
  const title = input.title.replace(/\s+/g, ' ').trim();
  const head = headOf(title).toLowerCase();

  const nonFashion = lastMatch(
    head,
    NON_FASHION_RULES.map(([name, pattern]) => ({ name, pattern })),
  );
  const fashion = lastMatch(
    head,
    FASHION_CATEGORY_RULES.map(([name, pattern]) => ({ name, pattern })),
  );

  // The title names the product.
  if (nonFashion || fashion) {
    if (nonFashion && (!fashion || nonFashion.end > fashion.end || (nonFashion.end === fashion.end && nonFashion.length >= fashion.length))) {
      return { module: 'saved', category: nonFashion.name };
    }
    return { module: 'fashion', category: fashion!.name };
  }

  // The title says nothing: try the rest of what we know.
  const scraped = (input.scrapedCategory ?? '').toLowerCase();
  const aiCategory = savedCategoryOf(`${input.aiCategory ?? ''} ${input.description ?? ''}`);
  if (aiCategory && input.aiModule !== 'fashion') return { module: 'saved', category: aiCategory };
  if (scraped && scraped !== 'general') return { module: 'fashion', category: scraped };
  if (input.aiModule === 'fashion') return { module: 'fashion', category: fashionCategoryOf(`${input.aiCategory ?? ''} ${title}`) };
  if (aiCategory) return { module: 'saved', category: aiCategory };
  if (input.store && FASHION_SHOPS.has(input.store)) return { module: 'fashion', category: 'general' };
  return { module: 'saved', category: 'Other' };
}
