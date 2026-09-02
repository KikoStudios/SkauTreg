# Win10 Dokumenty AI gateway

Authenticated, schema-constrained gateway between Convex and a local Ollama model. It listens only on loopback; production access is terminated by Tailscale Funnel on a separate HTTPS port.

Required environment variables: `WIN10_AI_TOKEN`. Optional: `PORT` (default `8791`), `OLLAMA_URL`, `OLLAMA_MODEL` (default `qwen2.5:1.5b`) and `AI_CONCURRENCY` (maximum `2`).

Endpoints:

- `GET /health` — readiness without document content.
- `POST /v1/process` — Bearer-authenticated structured processor contract.

The gateway logs request IDs, processor names, durations, and errors; it never logs document text or the bearer token.
