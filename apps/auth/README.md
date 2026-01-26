Auth service (dev)

- To run locally: from repo root `npm run compose:up` (starts mongo, rabbitmq, auth, users, gateway)
- Service port: 3001

Notes: This app imports the shared modules from the monorepo root `src/` (auth/users/config). Edit env vars or `.env` for configuration.
