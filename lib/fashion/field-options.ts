/** Suggestions for the add/edit form's "pick from the list or type your own" fields. */

export const CATEGORY_OPTIONS = [
  "tops",
  "bottoms",
  "shoes",
  "dresses",
  "outerwear",
  "accessories",
  "ethnic wear",
  "activewear",
  "innerwear",
  "bags",
  "watches",
  "jewellery",
  "sunglasses",
]

export const COLOR_OPTIONS = [
  "Black",
  "White",
  "Grey",
  "Navy Blue",
  "Blue",
  "Beige",
  "Cream",
  "Brown",
  "Khaki",
  "Olive",
  "Green",
  "Red",
  "Maroon",
  "Pink",
  "Orange",
  "Yellow",
  "Purple",
  "Multicolor",
]

const LETTER_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
const WAIST_SIZES = ["26", "28", "30", "32", "34", "36", "38", "40", "42"]
const SHOE_SIZES = ["UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"]

/** The usual sizes for a kind of item (used when a product link hasn't supplied its own list). */
export function sizeOptions(category: string): string[] {
  const c = category.toLowerCase()
  let standard: string[]
  if (/shoe|sneaker|sandal|boot|footwear|slipper|loafer/.test(c)) standard = SHOE_SIZES
  else if (/bottom|jean|trouser|pant|short|skirt|chino|jogger/.test(c)) standard = [...WAIST_SIZES, ...LETTER_SIZES]
  else if (/bag|watch|jewel|sunglass|accessor/.test(c)) standard = ["Free size", "One size"]
  else standard = [...LETTER_SIZES, "Free size"]

  return standard
}
