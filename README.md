# Mobile FPS Pulse — v6 (no CSV) + News Preview + Chat

## Files
- index.html, config.js, app.js, sentiment.js
- api/worker.js (Cloudflare Worker)
- assets/favicon.ico

## Worker endpoints (base: https://spring-bonus-310e.shyamvishnu19.workers.dev)
- POST /reddit/search   → expects: { subreddits: [...], limit? }
- POST /twitter/search  → expects: { handles: [...], hashtags: [...], limit? } (needs TWITTER_BEARER)
- POST /threads/search  → returns [] (placeholder)
- POST /news/fetch      → expects: { url: "<official news page>", limit? }
- POST /chat            → expects: { question: "<text>" } (needs OPENAI_API_KEY)

## Cloudflare changes (one-time)
1) Workers & Pages → open your worker → **Quick Edit** → paste `api/worker.js` → **Save & Deploy**.
2) Settings → **Variables** → **Add variable** (Text):
   - `OPENAI_API_KEY` = your OpenAI key (enables chat)
   - `TWITTER_BEARER` = your Twitter/X v2 bearer token (enables X posts)

## GitHub Pages
- Upload all files (keep folders). `config.js` already points to your worker URL.
- Visit your Pages URL; each game shows “Latest headlines” (News Preview) and, if configured, Reddit/X posts + sentiment.
