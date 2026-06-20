function keywordOverlap(product, keywords) {
  const text = `${product.name} ${product.category} ${product.platform}`.toLowerCase();
  if (!keywords?.length) return 0.5;
  const hits = keywords.filter((k) => text.includes(String(k).toLowerCase())).length;
  return Math.min(1, hits / Math.max(1, keywords.length));
}

function normalizePriceScore(price, min, max) {
  if (!price || max === min) return 0.5;
  return 1 - (price - min) / (max - min);
}

function reviewScore(reviews) {
  const n = Number(reviews || 0);
  return Math.min(1, Math.log10(n + 1) / 4);
}

function isIntentMatch(product, analysis) {
  const name = String(product.name || '').toLowerCase();
  const keywords = (analysis.keywords || []).map(String).map((x) => x.toLowerCase());

  // Strict intent: if user searched a mouse, do not show keyboard/watch/monitor.
  if (keywords.includes('mouse') && !name.includes('mouse')) return false;

  // Laptop intent should not show phones/accessories by mistake.
  if (analysis.category === 'laptop' && !/(laptop|notebook|macbook|victus|loq|tuf|nitro|dell g15)/i.test(name)) return false;

  return true;
}

function scorePool(pool, analysis, nearMatch = false) {
  const prices = pool.map((p) => Number(p.normalized_price_pkr || p.price || 0)).filter(Boolean);
  const minPrice = Math.min(...prices, 0);
  const maxPrice = Math.max(...prices, minPrice + 1);

  return pool.map((product) => {
    const price = Number(product.normalized_price_pkr || product.price || 0);
    const relevance = keywordOverlap(product, analysis.keywords);
    const priceScore = normalizePriceScore(price, minPrice, maxPrice);
    const ratingScore = Math.min(1, Number(product.rating || 0) / 5);
    const reviews = reviewScore(product.reviews);
    const availability = String(product.availability || '').toLowerCase().includes('stock') ? 1 : 0.4;
    const aiScore = (relevance * 0.45) + (priceScore * 0.25) + (ratingScore * 0.15) + (reviews * 0.10) + (availability * 0.05);
    const reasons = [];
    if (nearMatch && analysis.maxPrice && price > analysis.maxPrice) {
      reasons.push(`near match: above your PKR ${Number(analysis.maxPrice).toLocaleString()} budget`);
    }
    if (relevance > 0.6) reasons.push('good keyword match');
    if (priceScore > 0.6) reasons.push('competitive price');
    if (ratingScore > 0.75) reasons.push('strong rating');
    if (availability > 0.8) reasons.push('available');
    return {
      ...product,
      is_near_match: nearMatch && analysis.maxPrice && price > analysis.maxPrice,
      ai_score: Number(aiScore.toFixed(4)),
      ai_reason: reasons.length ? reasons.join(', ') : 'balanced match based on price and relevance'
    };
  }).sort((a, b) => Number(b.ai_score) - Number(a.ai_score));
}

export function rankProducts(products, analysis) {
  const intentMatched = products.filter((p) => isIntentMatch(p, analysis));

  const exact = intentMatched.filter((p) => {
    const price = Number(p.normalized_price_pkr || p.price || 0);
    // Exact results must respect the user's budget.
    if (analysis.maxPrice && price > analysis.maxPrice) return false;
    return true;
  });

  if (exact.length) return scorePool(exact, analysis, false);

  // Professional fallback: if no exact result is found, show closest relevant products
  // instead of a blank page. Example: "laptop under 1 lakh" may have no exact laptop,
  // so show the nearest laptops and clearly mark them as above budget.
  if (analysis.maxPrice && intentMatched.length) {
    const closest = [...intentMatched]
      .filter((p) => Number(p.normalized_price_pkr || p.price || 0) > 0)
      .sort((a, b) => Number(a.normalized_price_pkr || a.price || 0) - Number(b.normalized_price_pkr || b.price || 0))
      .slice(0, 8);
    return scorePool(closest, analysis, true);
  }

  if (!intentMatched.length) return [];
  return scorePool(intentMatched, analysis, false);
}
