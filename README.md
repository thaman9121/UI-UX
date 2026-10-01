# Orbit AI

A production-oriented, Grok-style AI chat application.

## Current stack

- React + TypeScript + Vite
- Node.js + Express
- OpenAI Responses API
- Supabase (database/auth planned for the next integration phase)
- Railway/Vercel-ready deployment structure

## Secrets

Never commit real API keys.

Copy `.env.example` to `.env` and add secrets locally. Production secrets belong in the deployment platform's environment-variable settings.

## Local development

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:8787

## Production build

```bash
npm run build
npm start
```
