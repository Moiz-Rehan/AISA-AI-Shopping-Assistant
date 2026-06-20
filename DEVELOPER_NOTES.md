# Developer Notes

## Architecture

Frontend React runs on port 5173 and uses Vite proxy to forward `/api/*` to backend port 8080.

Backend Express exposes:

- `/api/search`
- `/api/products/:id`
- `/api/auth/register`
- `/api/auth/login`
- `/api/favorites`
- `/api/history`
- `/api/alerts`
- `/api/admin/stats`
- `/api/healthz`

## Search Flow

1. Gemini analyzes query.
2. Regex fallback detects category, keywords, specs and budget.
3. Scraper service checks DB cache.
4. If cache miss, scraper tries real light scraping for Daraz.
5. Other platforms return normalized demo/fallback listings so demo never breaks.
6. Products are ranked by relevance, price, rating, reviews and availability.
7. Products are persisted in PostgreSQL.
8. Gemini summarizes top products; deterministic fallback is available.

## Security

Do not commit `.env` or real API keys. Use `.env.example` only.

## Making Scrapers More Real

Open `backend/src/services/scrapers.js` and replace individual platform functions with Playwright scrapers. Keep the same normalized product shape:

```js
{
  source_product_id,
  name,
  price,
  native_price,
  native_currency,
  normalized_price_pkr,
  platform,
  category,
  url,
  image_url,
  rating,
  reviews,
  availability,
  specs
}
```

## Frontend Premium Redesign Update
- Rebuilt navbar into a professional sticky header with active route states, responsive mobile menu, theme toggle, and user pill.
- Redesigned home page with modern hero section, quick search chips, feature cards, and polished AI preview panel.
- Improved search results UI with professional filters, AI analysis panel, product cards, near-match badges, and cleaner price display.
- Redesigned login/register page with two-column branded auth layout.
- Improved dashboard, admin, history, favorites, compare, alerts, and product detail layouts.
- Added responsive mobile styling and dark mode polish.
