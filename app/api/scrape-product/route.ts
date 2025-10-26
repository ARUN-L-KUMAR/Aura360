import { NextRequest, NextResponse } from 'next/server'
import puppeteer from 'puppeteer'
import * as cheerio from 'cheerio'
// import OpenAI from 'openai'

interface ProductData {
  product_name: string
  brand: string
  category: string
  price: {
    current: string
    original?: string
    discount?: string
  }
  color: string
  size: string[] | string
  rating?: string
  reviews_count?: string
  description: string
  features?: string[]
  images: string[]
  buying_link: string
}

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY
// })

async function scrapeWithPuppeteer(url: string): Promise<string> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 3000))

    const content = await page.content()
    return content
  } finally {
    await browser.close()
  }
}

// async function aiEnhanceData(rawText: string, url: string): Promise<ProductData | null> {
//   try {
//     const prompt = `
// Extract structured product data from the following HTML content and return it as valid JSON. The product URL is: ${url}

// Focus on extracting:
// - product_name: The main product title/name
// - brand: Brand name if available
// - category: Product category (e.g., "Men Clothing > T-Shirts", "Shoes", etc.)
// - price: Object with current, original, and discount if available
// - color: Available colors
// - size: Available sizes (can be array or string)
// - rating: Star rating if available
// - reviews_count: Number of reviews
// - description: Product description
// - features: Array of key features/benefits
// - images: Array of image URLs (up to 5 images)

// Return only valid JSON without any markdown formatting or explanations.

// HTML Content:
// ${rawText.substring(0, 10000)} // Limit content for API
// `

//     const response = await openai.chat.completions.create({
//       model: "gpt-4o-mini",
//       messages: [{ role: "user", content: prompt }],
//       temperature: 0.1,
//       max_tokens: 2000
//     })

//     const content = response.choices[0]?.message?.content
//     if (!content) return null

//     // Clean the response to ensure it's valid JSON
//     const cleanedContent = content.replace(/```json\s*|\s*```/g, '').trim()
//     return JSON.parse(cleanedContent)
//   } catch (error) {
//     console.error('AI enhancement failed:', error)
//     return null
//   }
// }

function parseWithCheerio(html: string, url: string): ProductData | null {
  const $ = cheerio.load(html)

  // Try different selectors for different sites
  let productData: Partial<ProductData> = {
    buying_link: url,
    images: [],
    features: []
  }

  if (url.includes('amazon') || url.includes('amzn')) {
    // Amazon selectors
    productData.product_name = $('#productTitle').text().trim() ||
                              $('#title').text().trim() ||
                              $('h1').first().text().trim()

    productData.brand = $('#bylineInfo').text().trim() ||
                       $('#brand').text().trim() ||
                       $('[data-cy="bylineInfo"]').text().trim()

    const currentPrice = $('#priceblock_ourprice').text().trim() ||
                        $('#priceblock_dealprice').text().trim() ||
                        $('.a-price .a-offscreen').first().text().trim() ||
                        $('[data-cy="price-recipe"]').text().trim()

    const originalPrice = $('#priceblock_listprice').text().trim() ||
                         $('.a-text-price .a-offscreen').first().text().trim()

    const discount = $('.savingsPercentage').text().trim() ||
                    $('[data-cy="discountString"]').text().trim()

    productData.price = {
      current: currentPrice,
      original: originalPrice || undefined,
      discount: discount || undefined
    }

    productData.rating = $('[data-hook="rating-out-of-text"]').text().trim() ||
                        $('.a-icon-star').text().trim() ||
                        $('[data-cy="productRating"]').text().trim()

    productData.images = []
    $('img[data-image-index], .a-dynamic-image').each((_, img) => {
      const src = $(img).attr('src') || $(img).attr('data-src')
      if (src && !src.includes('spinner') && productData.images!.length < 5) {
        productData.images!.push(src)
      }
    })

    productData.description = $('#productDescription').text().trim() ||
                             $('#feature-bullets').text().trim() ||
                             $('[data-cy="productDescription"]').text().trim()

    // Extract features from bullet points
    productData.features = []
    $('#feature-bullets li, .a-list-item').each((_, li) => {
      const feature = $(li).text().trim()
      if (feature && productData.features!.length < 10) {
        productData.features!.push(feature)
      }
    })

  } else if (url.includes('flipkart')) {
    // Flipkart selectors
    productData.product_name = $('[data-cy="productTitle"]').text().trim() ||
                              $('h1').text().trim() ||
                              $('.yhB1nd span').first().text().trim()

    productData.brand = $('.YcKMOe').text().trim() ||
                       $('[data-cy="productBrand"]').text().trim()

    const currentPrice = $('[data-cy="productPrice"]').text().trim() ||
                        $('.Nx9bqj').text().trim()

    const originalPrice = $('.yRaY8j').text().trim()

    const discount = $('.UkUFwK').text().trim()

    productData.price = {
      current: currentPrice,
      original: originalPrice || undefined,
      discount: discount || undefined
    }

    productData.rating = $('[data-cy="productRating"]').text().trim() ||
                        $('.XQDdHH').text().trim()

    productData.reviews_count = $('[data-cy="productReviewsCount"]').text().trim() ||
                               $('._2_R_DZ').text().trim()

    productData.images = []
    $('.R0cyWM img, ._396cs4').each((_, img) => {
      const src = $(img).attr('src')
      if (src && productData.images!.length < 5) {
        productData.images!.push(src)
      }
    })

    productData.description = $('[data-cy="productDescription"]').text().trim() ||
                             $('.X3BRps').text().trim()

    // Extract features
    productData.features = []
    $('._2-riNZ, .X3BRps li').each((_, li) => {
      const feature = $(li).text().trim()
      if (feature && productData.features!.length < 10) {
        productData.features!.push(feature)
      }
    })

  } else if (url.includes('myntra')) {
    // Myntra selectors
    productData.product_name = $('.pdp-title').text().trim() ||
                              $('h1').text().trim() ||
                              $('.pdp-name').text().trim()

    productData.brand = $('.pdp-brand').text().trim() ||
                       $('.brand').text().trim()

    const currentPrice = $('.pdp-price').text().trim()

    const originalPrice = $('.pdp-mrp').text().trim()

    const discount = $('.pdp-discount').text().trim()

    productData.price = {
      current: currentPrice,
      original: originalPrice || undefined,
      discount: discount || undefined
    }

    productData.rating = $('.index-overallRating').text().trim()

    productData.images = []
    $('.image-grid-image img').each((_, img) => {
      const src = $(img).attr('src')
      if (src && productData.images!.length < 5) {
        productData.images!.push(src)
      }
    })

    productData.description = $('.pdp-product-description-content').text().trim() ||
                             $('.pdp-productDetails').text().trim()

    // Extract features
    productData.features = []
    $('.pdp-product-description-content li, .pdp-sizeFitDesc li').each((_, li) => {
      const feature = $(li).text().trim()
      if (feature && productData.features!.length < 10) {
        productData.features!.push(feature)
      }
    })
  }

  // Set defaults for missing fields
  if (!productData.category) {
    if (url.includes('amazon') || url.includes('amzn')) productData.category = 'General'
    else if (url.includes('flipkart')) productData.category = 'General'
    else if (url.includes('myntra')) productData.category = 'Fashion'
    else productData.category = 'General'
  }

  if (!productData.color) productData.color = ''
  if (!productData.size) productData.size = ''
  if (!productData.description) productData.description = productData.product_name || 'No description available'
  if (!productData.price?.current) productData.price = { current: '' }

  return productData as ProductData
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  try {
    console.log('Scraping URL:', url)

    // For now, return mock data to test the integration
    // TODO: Uncomment the real scraping code below when ready

    // Step 1: Scrape HTML with Puppeteer
    // const html = await scrapeWithPuppeteer(url)

    // Step 2: Parse with Cheerio
    // let productData = parseWithCheerio(html, url)

    // Mock data for testing
    let productData: ProductData | null = null

    if (url.includes('amazon')) {
      productData = {
        product_name: "Wireless Bluetooth Headphones",
        brand: "Sony",
        category: "Electronics",
        price: {
          current: "₹2,999",
          original: "₹4,999",
          discount: "40%"
        },
        color: "Black",
        size: "",
        rating: "4.3",
        reviews_count: "1,245",
        description: "High-quality wireless headphones with noise cancellation and premium sound.",
        features: ["Active Noise Cancellation", "30-hour Battery", "Quick Charge", "Bluetooth 5.0"],
        images: ["https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"],
        buying_link: url
      }
    } else if (url.includes('flipkart')) {
      productData = {
        product_name: "Smartphone Case",
        brand: "Brand",
        category: "Accessories",
        price: {
          current: "₹499",
          original: "₹799",
          discount: "38%"
        },
        color: "Transparent",
        size: "",
        rating: "4.1",
        reviews_count: "892",
        description: "Protective case for smartphones with shock absorption.",
        features: ["Shock Absorption", "Screen Protection", "Wireless Charging Compatible"],
        images: ["https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=400"],
        buying_link: url
      }
    } else if (url.includes('myntra')) {
      productData = {
        product_name: "Cotton T-Shirt",
        brand: "Levi's",
        category: "Fashion",
        price: {
          current: "₹1,299",
          original: "₹1,999",
          discount: "35%"
        },
        color: "Navy Blue",
        size: "M",
        rating: "4.4",
        reviews_count: "567",
        description: "Comfortable cotton t-shirt with classic fit.",
        features: ["100% Cotton", "Machine Washable", "Classic Fit"],
        images: ["https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400"],
        buying_link: url
      }
    }

    if (!productData) {
      return NextResponse.json({ error: 'Unable to extract product data from this URL' }, { status: 400 })
    }

    return NextResponse.json(productData)
  } catch (error) {
    console.error('Error scraping product:', error)
    return NextResponse.json({ error: 'Failed to scrape product data' }, { status: 500 })
  }
}