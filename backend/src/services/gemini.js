import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { detectCategory, extractBudget, extractKeywords, normalizeQuery, parseSpecs, normalizeCategory } from '../utils/text.js';

function fallbackAnalysis(rawQuery) {
  const processedQuery = normalizeQuery(rawQuery);
  const keywords = extractKeywords(rawQuery);
  return {
    processedQuery,
    intent: `Find best matching shopping products for: ${processedQuery}`,
    category: detectCategory(rawQuery),
    keywords,
    maxPrice: extractBudget(rawQuery),
    specs: parseSpecs(rawQuery),
    brand: keywords.find((k) => ['hp', 'dell', 'lenovo', 'asus', 'acer', 'apple', 'samsung', 'iphone', 'redmi'].includes(k)) || null
  };
}

function safeJson(text) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

export async function analyzeQuery(rawQuery) {
  if (!env.geminiApiKey) return fallbackAnalysis(rawQuery);
  try {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are AISA, an AI shopping query parser. Return only JSON.\n\nUser query: "${rawQuery}"\n\nJSON fields:\nprocessedQuery:string, intent:string, category:string, keywords:string[], maxPrice:number|null, specs:object, brand:string|null.\nUnderstand Roman Urdu/English budgets like under 1 lakh = 100000.`;
    const result = await model.generateContent(prompt);
    const parsed = safeJson(result.response.text());
    if (!parsed) return fallbackAnalysis(rawQuery);
    const fallback = fallbackAnalysis(rawQuery);
    const merged = { ...fallback, ...parsed };
    merged.category = normalizeCategory(merged.category, rawQuery);
    merged.maxPrice = extractBudget(rawQuery) || merged.maxPrice || null;
    merged.keywords = Array.isArray(merged.keywords) && merged.keywords.length ? merged.keywords : fallback.keywords;
    return merged;
  } catch (error) {
    console.warn('Gemini query analysis fallback:', error.message);
    return fallbackAnalysis(rawQuery);
  }
}

export async function summarizeProducts(products, analysis) {
  const top = products.slice(0, 30).map((p) => ({
    id: p.id,
    name: p.name,
    platform: p.platform,
    price: Number(p.normalized_price_pkr || p.price || 0),
    rating: Number(p.rating || 0),
    score: Number(p.ai_score || 0)
  }));

  if (!top.length) {
    return {
      commentary: 'No products found. Try a broader query or increase your budget.',
      bestValueProductIds: [],
      caveats: ['No listings were available from configured sources.']
    };
  }

  const prices = top.map((p) => p.price).filter(Boolean).sort((a, b) => a - b);
  const hasNearMatches = products.some((p) => p.is_near_match);
  const fallback = {
    commentary: hasNearMatches
      ? `No exact listing was found within your budget for ${analysis.processedQuery}. Showing closest relevant matches instead. Nearest price starts around PKR ${prices[0]?.toLocaleString() || 0}.`
      : `Found ${top.length} relevant listings for ${analysis.processedQuery}. Price range is roughly PKR ${prices[0]?.toLocaleString() || 0} to PKR ${prices.at(-1)?.toLocaleString() || 0}. Higher AI score means better match based on relevance, price, rating, reviews and availability.`,
    bestValueProductIds: top.slice(0, 3).map((p) => p.id),
    caveats: hasNearMatches
      ? ['These are near matches and may be above your requested budget. Always verify price on seller page before buying.']
      : ['External sites may change prices. Always verify on the seller page before buying.']
  };

  if (!env.geminiApiKey) return fallback;

  try {
    const genAI = new GoogleGenerativeAI(env.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const prompt = `You are AISA. Summarize only these supplied listings. Never invent prices, ratings, specs or IDs. Return JSON with commentary:string, bestValueProductIds:string[], caveats:string[].\nIntent: ${analysis.intent}\nListings: ${JSON.stringify(top)}`;
    const result = await model.generateContent(prompt);
    const parsed = safeJson(result.response.text());
    return parsed || fallback;
  } catch (error) {
    console.warn('Gemini summary fallback:', error.message);
    return fallback;
  }
}
