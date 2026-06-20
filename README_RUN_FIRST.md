# AISA Improved Project — Run Guide for Visual Studio Code

Ye full-stack AI shopping assistant project hai. Is mein React frontend, Express backend, Supabase PostgreSQL database, Gemini AI, caching, search history, favorites, compare, price alerts aur admin status pages include hain.

## 1. Important Security Note
Aap ne jo Gemini API keys chat mein paste ki thin, un keys ko exposed samjho. Google AI Studio se unhein revoke/regenerate kar dein. Project mein sirf nayi key use karein.

## 2. Required Software
- Node.js 20 ya latest LTS
- Visual Studio Code
- Supabase PostgreSQL database URL
- Gemini API key

## 3. Open Project
VS Code mein folder open karein:

```bash
aisa-improved-project
```

## 4. Install Packages
VS Code terminal mein:

```bash
npm run install:all
```

## 5. Environment Setup
`.env.example` file ka content copy karein aur `backend/.env` file bana kar us mein paste karein.

Required values:

```env
DATABASE_URL=your_supabase_postgres_connection_string
GEMINI_API_KEY=your_new_gemini_key
SESSION_SECRET=any_long_secret_text
PORT=8080
CLIENT_URL=http://localhost:5173
SCRAPER_MODE=hybrid
```

## 6. Database Tables Create Karein

```bash
npm run db:init
```

Ye command `backend/src/db/schema.sql` ko Supabase PostgreSQL mein run karegi.

## 7. Project Run Karein

```bash
npm run dev
```

Backend:

```text
http://localhost:8080
```

Frontend:

```text
http://localhost:5173
```

## 8. Test Search
Browser mein open karein:

```text
http://localhost:5173
```

Search examples:

- gaming laptop under 1 lakh
- iphone under 200000
- wireless earbuds under 10000
- rtx 4060 laptop

## 9. What Is Improved
- Secure `.env.example`
- No real API key included
- Supabase PostgreSQL schema
- Gemini AI query understanding with regex fallback
- Product ranking formula
- Search cache with 6-hour TTL
- Favorites
- Search history
- Compare page
- Price alerts
- Admin scraper/cache status
- Professional responsive UI
- Scraper fallback mode so project runs even if external websites block requests

## 10. Notes About Scraping
Real shopping websites often change HTML, add CAPTCHA, or block IPs. This project uses a safe hybrid strategy: it tries lightweight real scraping where possible, otherwise it falls back to demo normalized products so the project keeps working for demo/presentation.


## Near Match Fallback
If a strict budget search has no exact result, for example `laptop under 1 lakh`, the app now shows closest relevant products and marks them as near matches instead of showing a blank page.
