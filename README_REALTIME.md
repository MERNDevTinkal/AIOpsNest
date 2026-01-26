Realtime tracking feature

Overview
- `realtime` service (NestJS) exposes:
  - Webhook endpoint: POST /webhooks/events — accepts payloads like { id, ts, x, y, z?, mass? }
  - Socket.IO namespace `/realtime` broadcasting `object.update` events with computed metrics: speed, distance, acceleration, force

Frontend
- `apps/web` includes a `Realtime` page that connects to WebSocket and renders objects on a canvas.

Next steps to productionize
- Persist events to time-series DB (InfluxDB) or DynamoDB for analysis
- Move in-memory state to Redis for scale and cross-process access
- Use message broker (SNS/SQS, RabbitMQ, Kinesis) for buffering and scaling webhook ingestion
- Add authentication & signing/verification of webhook payloads
- Add tests, monitoring (CloudWatch/Prometheus), and k8s manifests for `realtime` service

How to test locally
1. Start dev stack: `npm run compose:up`
2. Start the realtime service: `docker-compose -f docker-compose.dev.yml up --build realtime`
3. Open frontend: `http://localhost:3000/realtime`
4. Simulate webhook: `curl -X POST http://localhost:4000/webhooks/events -H "Content-Type: application/json" -d '{"id":"obj1","ts":$(date +%s%3N),"x":100,"y":100}'`
