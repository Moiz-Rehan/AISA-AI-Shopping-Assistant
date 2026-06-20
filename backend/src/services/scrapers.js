import * as cheerio from 'cheerio';
import { env } from '../config/env.js';
import { getFreshCache, getStaleCache, setCache, setPlatformStatus } from './cache.js';
import { slugify } from '../utils/text.js';

const demoCatalog = {
  laptop: [
    ['Daraz', 'HP Victus Gaming Laptop 16GB RAM 512GB SSD RTX 3050', 185000, 4.4, 217, 'In Stock'],
    ['Daraz', 'Lenovo LOQ Ryzen 7 Gaming Laptop RTX 4060', 284000, 4.6, 91, 'In Stock'],
    ['OLX', 'Used Dell G15 Gaming Laptop RTX 3050 16GB RAM', 165000, 4.1, 18, 'Available'],
    ['Amazon IN', 'ASUS TUF Gaming F15 RTX 4060 16GB RAM', 299000, 4.5, 1280, 'In Stock'],
    ['eBay', 'Acer Nitro 5 Gaming Laptop GTX 1650', 145000, 4.0, 320, 'Available']
  ],
  mobile: [
    ['Daraz', 'Samsung Galaxy A55 5G 256GB PTA Approved', 129999, 4.7, 802, 'In Stock'],
    ['Daraz', 'iPhone 13 128GB PTA Approved', 184999, 4.6, 421, 'In Stock'],
    ['OLX', 'Used iPhone 12 Pro 128GB Non PTA', 115000, 4.0, 37, 'Available'],
    ['Amazon IN', 'Redmi Note 13 Pro Plus 5G', 105000, 4.4, 2100, 'In Stock']
  ],
  audio: [
    ['Daraz', 'Audionic Wireless Earbuds ENC Low Latency', 4999, 4.3, 1500, 'In Stock'],
    ['Daraz', 'Ronin R-520 Earbuds with Gaming Mode', 6499, 4.4, 987, 'In Stock'],
    ['OLX', 'Apple AirPods Pro 2 Used Original', 38000, 4.2, 15, 'Available']
  ],
  accessories: [
    ['Daraz', 'Logitech B100 USB Wired Mouse', 1299, 4.5, 2400, 'In Stock'],
    ['Daraz', 'Zero ZR-60 Wireless Mouse 2.4G', 1699, 4.2, 910, 'In Stock'],
    ['Daraz', 'Redragon Gaming Mouse RGB 7200 DPI', 2899, 4.6, 620, 'In Stock'],
    ['OLX', 'Used Logitech Wireless Mouse Good Condition', 1200, 4.0, 18, 'Available'],
    ['Amazon IN', 'HP Wired Mouse 100', 2600, 4.4, 5400, 'In Stock'],
    ['eBay', 'Dell Optical Mouse USB', 2400, 4.1, 820, 'Available'],
    ['Daraz', 'Mechanical Keyboard RGB', 5499, 4.3, 330, 'In Stock']
  ],
  watch: [
    ['Daraz', 'Smart Watch Bluetooth Calling Waterproof', 7499, 4.2, 700, 'In Stock'],
    ['Daraz', 'Mibro Lite Smartwatch AMOLED', 8999, 4.5, 810, 'In Stock']
  ],
  general: [
    ['Daraz', 'Smart Watch Bluetooth Calling Waterproof', 7499, 4.2, 700, 'In Stock'],
    ['OLX', 'Samsung LED Monitor 24 inch', 24000, 4.0, 21, 'Available'],
    ['Amazon IN', 'Logitech Wireless Mouse Silent Click', 6500, 4.7, 9800, 'In Stock']
  ]
};

function cleanSellerQuery(text, analysis) {
  const fallback = analysis?.processedQuery || analysis?.category || 'product';
  let query = String(text || fallback)
    .replace(/\bunder\s*\d+[kK]?\b/g, '')
    .replace(/\bbelow\s*\d+[kK]?\b/g, '')
    .replace(/\b1\s*lakh\b/g, '')
    .replace(/\b2\s*lakh\b/g, '')
    .replace(/\b3\s*lakh\b/g, '')
    .replace(/\bpkr\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Daraz/OLX search gets better results with a broad query instead of long demo titles.
  const words = query.split(' ').filter(Boolean);
  if (words.length > 5) {
    const important = ['gaming', 'laptop', 'mouse', 'keyboard', 'iphone', 'samsung', 'earbuds', 'watch', 'rtx', 'logitech', 'hp', 'dell', 'lenovo', 'acer'];
    const selected = words.filter((w) => important.includes(w.toLowerCase())).slice(0, 4);
    query = selected.length ? selected.join(' ') : words.slice(0, 4).join(' ');
  }

  return query || fallback;
}

function slugForOlx(text) {
  return String(text || 'product')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

function sellerSearchUrl(platformName, queryText, analysis = null) {
  const query = cleanSellerQuery(queryText, analysis);
  const q = encodeURIComponent(query);
  if (platformName === 'Daraz') return `https://www.daraz.pk/catalog/?q=${q}`;
  if (platformName === 'OLX') return `https://www.olx.com.pk/items/q-${slugForOlx(query)}`;
  if (platformName === 'Amazon IN') return `https://www.amazon.in/s?k=${q}`;
  if (platformName === 'eBay') return `https://www.ebay.com/sch/i.html?_nkw=${q}`;
  return `https://www.google.com/search?q=${q}`;
}

function demoProducts(platform, analysis) {
  const data = demoCatalog[analysis.category] || demoCatalog.general;
  const wanted = (analysis.keywords || []).map((k) => String(k).toLowerCase());
  return data
    .filter((row) => !platform || row[0] === platform)
    .filter((row) => {
      // In demo mode, do not show keyboard/monitor etc. when user clearly searched mouse.
      const name = row[1].toLowerCase();
      if (wanted.includes('mouse') && !name.includes('mouse')) return false;
      return true;
    })
    .map(([platformName, name, price, rating, reviews, availability]) => ({
      source_product_id: `${slugify(platformName)}-${slugify(name)}`,
      name,
      price,
      native_price: price,
      native_currency: 'PKR',
      normalized_price_pkr: price,
      platform: platformName,
      category: analysis.category,
      // Demo products now open real seller search pages instead of example.com.
      url: sellerSearchUrl(platformName, analysis.processedQuery || name, analysis),
      image_url: `https://placehold.co/600x400?text=${encodeURIComponent(name.slice(0, 22))}`,
      rating,
      reviews,
      availability,
      specs: analysis.specs || {}
    }));
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeDarazLight(analysis) {
  const url = `https://www.daraz.pk/catalog/?q=${encodeURIComponent(analysis.processedQuery)}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const items = [];
  $('a').each((_, el) => {
    if (items.length >= env.maxProductsPerPlatform) return;
    const text = $(el).text().replace(/\s+/g, ' ').trim();
    const href = $(el).attr('href') || '';
    const priceMatch = text.match(/Rs\.?\s*([0-9,]+)/i);
    if (text.length > 20 && priceMatch) {
      const price = Number(priceMatch[1].replace(/,/g, ''));
      items.push({
        source_product_id: `daraz-${slugify(text).slice(0, 50)}`,
        name: text.slice(0, 160),
        price,
        native_price: price,
        native_currency: 'PKR',
        normalized_price_pkr: price,
        platform: 'Daraz',
        category: analysis.category,
        // Use a stable seller search URL for Daraz because direct scraped links can expire or return product-not-found.
        url: sellerSearchUrl('Daraz', analysis.processedQuery || text, analysis),
        image_url: `https://placehold.co/600x400?text=${encodeURIComponent('Daraz')}`,
        rating: 0,
        reviews: 0,
        availability: 'Check seller',
        specs: analysis.specs || {}
      });
    }
  });
  return items;
}

function cacheQuery(analysis) {
  // Category + budget is included so old wrong cache does not pollute new filtered searches.
  return `${analysis.category}:${analysis.processedQuery}:max-${analysis.maxPrice || 'any'}`;
}

async function platformProducts(platform, analysis) {
  const key = cacheQuery(analysis);
  const fresh = await getFreshCache(platform, key);
  if (fresh) {
    await setPlatformStatus(platform, 'cache', 'Served from fresh cache');
    return fresh;
  }

  try {
    let products = [];
    if (env.scraperMode !== 'demo' && platform === 'Daraz') {
      products = await scrapeDarazLight(analysis);
    }
    if (!products.length) {
      products = demoProducts(platform, analysis);
    }
    await setCache(platform, key, products, 'fresh', 'Scraped/fallback products cached');
    await setPlatformStatus(platform, 'ok', `${products.length} products returned`);
    return products;
  } catch (error) {
    const stale = await getStaleCache(platform, key);
    if (stale) {
      await setPlatformStatus(platform, 'stale-cache', error.message);
      return stale;
    }
    const fallback = demoProducts(platform, analysis);
    await setCache(platform, key, fallback, 'fallback', error.message);
    await setPlatformStatus(platform, 'fallback', error.message);
    return fallback;
  }
}

export async function collectSources(analysis) {
  const platforms = analysis.category === 'vehicle'
    ? ['OLX']
    : ['Daraz', 'OLX', 'Amazon IN', 'eBay'];
  const result = await Promise.all(platforms.map((platform) => platformProducts(platform, analysis)));
  return result.flat();
}
