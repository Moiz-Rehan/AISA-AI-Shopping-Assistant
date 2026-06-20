export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

export function normalizeQuery(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[₹,$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractBudget(query) {
  const q = normalizeQuery(query);

  // Roman Urdu / English budget words
  const lakh = q.match(/(?:under|below|less than|max|upto|up to|tak|andar|se kam|sy kam)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac|lack)/i);
  if (lakh) return Math.round(Number(lakh[1]) * 100000);

  const thousand = q.match(/(?:under|below|less than|max|upto|up to|tak|andar|se kam|sy kam)?\s*(\d+(?:\.\d+)?)\s*(?:k|thousand|hazaar|hazar)\b/i);
  if (thousand) return Math.round(Number(thousand[1]) * 1000);

  const num = q.match(/(?:under|below|less than|max|upto|up to|tak|andar|se kam|sy kam)\s*(\d{3,9})/i);
  if (num) return Number(num[1]);

  return null;
}

export function detectCategory(query) {
  const q = normalizeQuery(query);
  const rules = [
    ['laptop', ['laptop', 'notebook', 'macbook', 'rtx', 'gpu', 'gaming laptop']],
    ['mobile', ['phone', 'mobile', 'iphone', 'samsung', 'redmi', 'oppo', 'vivo', 'infinix']],
    ['audio', ['earbud', 'earbuds', 'airpod', 'headphone', 'speaker', 'handsfree']],
    ['accessories', ['mouse', 'gaming mouse', 'wireless mouse', 'keyboard', 'webcam', 'charger', 'usb', 'cable']],
    ['watch', ['watch', 'smartwatch', 'band']],
    ['fashion', ['shirt', 'shoes', 'jacket', 'dress', 'kurta']],
    ['vehicle', ['car', 'bike', 'motorcycle', 'honda civic', 'alto', 'mehran']]
  ];
  for (const [category, words] of rules) {
    if (words.some((word) => q.includes(word))) return category;
  }
  return 'general';
}

export function normalizeCategory(category, rawQuery = '') {
  const forced = detectCategory(rawQuery);
  if (forced !== 'general') return forced;
  const c = String(category || '').toLowerCase().trim();
  const allowed = new Set(['laptop', 'mobile', 'audio', 'accessories', 'watch', 'fashion', 'vehicle', 'general']);
  if (allowed.has(c)) return c;
  if (['electronics', 'computer', 'computer_accessory', 'peripheral', 'peripherals'].includes(c)) return 'accessories';
  return 'general';
}

export function extractKeywords(query) {
  const stop = new Set([
    'under', 'below', 'less', 'than', 'with', 'for', 'best', 'price', 'lakh', 'lac', 'lack',
    'k', 'rs', 'pkr', 'new', 'used', 'tak', 'andar', 'se', 'sy', 'kam', 'upto', 'up', 'to'
  ]);
  return normalizeQuery(query)
    .split(' ')
    .map((x) => x.trim())
    .filter((x) => x.length > 1 && !stop.has(x))
    .filter((x) => !/^\d+(?:\.\d+)?k?$/.test(x))
    .slice(0, 12);
}

export function parseSpecs(query) {
  const q = String(query || '').toLowerCase();
  const specs = {};
  const ram = q.match(/(\d+)\s*gb\s*ram/);
  const ssd = q.match(/(\d+)\s*(gb|tb)\s*(ssd|storage)/);
  const gpu = q.match(/(rtx\s*\d{3,4}|gtx\s*\d{3,4}|rx\s*\d{3,4})/i);
  if (ram) specs.ram = `${ram[1]}GB`;
  if (ssd) specs.storage = `${ssd[1]}${ssd[2].toUpperCase()}`;
  if (gpu) specs.gpu = gpu[1].toUpperCase().replace(/\s+/g, ' ');
  return specs;
}
