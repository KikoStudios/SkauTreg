# Win10 Dokumenty AI gateway

Authenticated, schema-constrained gateway between Convex and a local Ollama model. It listens only on loopback; production access is terminated by Tailscale Funnel on a separate HTTPS port.

Required environment variables: `WIN10_AI_TOKEN`. Optional: `PORT` (default `8791`), `OLLAMA_URL`, `OLLAMA_MODEL` (default `qwen2.5:1.5b`) and `AI_CONCURRENCY` (maximum `2`).

Endpoints:

- `GET /health` — readiness without document content.
- `POST /v1/process` — Bearer-authenticated structured processor contract.

The gateway logs request IDs, processor names, durations, and errors; it never logs document text or the bearer token.

Run the live contract probe with `npm run probe:document-ai`. It covers exact-source agenda labels, preserved time ranges, material/activity separation, explicit task extraction, and passive text that must not become a task. It requires a running gateway plus `WIN10_AI_TOKEN`; use `WIN10_AI_BASE_URL` only when the gateway is exposed somewhere other than loopback. The probe is intentionally an integration check, so model latency and availability are outside its deterministic assertions.
