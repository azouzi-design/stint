# Prototype sandbox

Throwaway front-end for ideating on product design and structure.

- Run: `npm run proto` → http://localhost:5174
- Shares styling (`@/index.css`), fonts, tokens, pixelarticons and `@/lib/utils` with the real app.
- No Supabase, no env vars. Use in-memory or localStorage mock data only.
- Not included in the production build (`npm run build` only builds `src/`).
- When something works, port it properly into `src/`.
