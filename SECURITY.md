# Security

Report vulnerabilities privately. Do not open a public issue that includes secrets, tokens, session cookies, or a working exploit.

**Email:** [nonsmartcity@gmail.com](mailto:nonsmartcity@gmail.com)

Please include the affected path or endpoint, impact, and steps that do not require publishing a live key.

## Secrets

- Copy `.env.local.example` to `.env.local`. Never commit `.env` or `.env.local`.
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `JWT_SECRET`, and `TURSO_AUTH_TOKEN` are operator-owned. This repo does not ship them.
- If a key leaked in a fork or screenshot, rotate it at the provider, then tell us which name leaked — not the value.

## What this app is not

This is independent civic software. It is not a substitute for official Thai emergency, police, or meteorological channels. A dashboard bug is not an official alert failure.
