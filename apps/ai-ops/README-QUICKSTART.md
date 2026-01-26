Quickstart

1. Copy .env.example to .env and set GH_TOKEN if you want PR creation (not implemented).
2. npm ci
3. npm run dev
4. POST /webhook/error with a JSON payload like { "type": "lint", "details": { ... } }
