# Orbit AI

A production-oriented, Grok-style AI chat application.

## Current stack

- React 19 + TypeScript + Vite
- Node.js 24 + Express
- OpenAI Responses API with server-side streaming
- Supabase planned for auth, conversations, storage, and realtime data
- Railway/Vercel-ready deployment structure

The OpenAI Responses API supports semantic streaming events such as `response.output_text.delta` and `response.completed`. Orbit uses those events through the server so the browser never receives the OpenAI secret key.

## Secrets

Never commit real API keys.

Local development:
1. Copy `.env.example` to `.env`.
2. Put `OPENAI_API_KEY` in that server-side file.
3. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only when it is added later.

Production:
- Add secrets in your hosting provider's Environment Variables / Secrets section.
- Do not paste secrets into source files, `src/`, GitHub issues, or chat messages.
- Client-side variables will use only publishable/public values when required.

Required server variables:

```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.6-luna
PORT=8787
```

Reserved for the next integration phase:

```
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TAVILY_API_KEY=
```

## Local development

Install dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev
```

Run the API in a second terminal:

```bash
npm run dev:api
```

Frontend: http://localhost:5173
API health: http://localhost:8787/api/health

## Production build

```bash
npm run build
npm start
```

The Express server serves the compiled Vite app and the API from the same deployment.

## Project direction

Next integrations will add:

- Supabase authentication
- Persistent chat history
- Secure row-level access policies
- Web search with citations
- File and image input
- Multi-provider model routing
- Usage limits and rate limiting
- Production observability
- Automated deployments
