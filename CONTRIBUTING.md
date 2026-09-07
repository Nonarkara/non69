# Contributing

Thailand Watch is independent studio software from Non Arkaraprasertkul / Axiom X Co., Ltd. It is not an official depa, NASA, or municipal product.

## Clone, env, run

```bash
git clone https://github.com/Nonarkara/non69.git
cd non69
npm install
cp .env.local.example .env.local
npm run seed
npm run dev
```

Open [http://localhost:3000/watch](http://localhost:3000/watch). Leave `.env.local` empty unless you want Claude or meeting-transcription features. Do not commit `.env`, `.env.local`, tokens, or API keys.

## What belongs in a PR

- Bug fixes with a clear reproduction
- Docs that make the clone path more honest
- Data-source or UI fixes that keep labels, sources, and uncertainty visible
- Accessibility and reliability work

Please do not send:

- Secrets, credentials, or production tokens
- Changes that present this repo as an official government or agency system
- Features that only work if a stranger pastes a private key

## Pull request bar

1. `npm run lint` should stay clean for files you touch.
2. The Watch UI should still load without `ANTHROPIC_API_KEY`.
3. Keep civic signals labeled as curated intelligence, not official alerts.

Questions: open a GitHub issue. Security reports: see [SECURITY.md](SECURITY.md).
