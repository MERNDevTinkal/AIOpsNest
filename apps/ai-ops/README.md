# AI-Ops (scaffold)

This service receives error alerts (webhook) and runs registered agents to propose fixes. The coordinator collects votes and decides by majority.

- POST /webhook/error  - Receive an alert JSON payload
- GET  /health         - Healthcheck

Notes:
- Auto-apply is NOT implemented. In production you'd create PRs and only auto-apply after approvals and canary testing.
- Agents are simple and execute shell commands; be careful running in production.
