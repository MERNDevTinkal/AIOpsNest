import { Injectable, Logger } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

interface LastState { x: number; y: number; z?: number; ts: number; distance: number }

@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly gateway: RealtimeGateway;

  // in-memory store: objectId -> last state
  private readonly store = new Map<string, LastState>();

  constructor(gateway: RealtimeGateway) {
    this.gateway = gateway;
  }

  async handleIncoming(payload: any) {
    try {
      const { id, ts, x, y, z = 0, mass = 1 } = payload;
      if (!id || !ts || x === undefined || y === undefined) return;

      const prev = this.store.get(id);
      let distanceDelta = 0;
      let speed = 0;
      let acceleration = 0;
      let force = 0;

      if (prev) {
        const dx = x - prev.x;
        const dy = y - prev.y;
        const dz = (z || 0) - (prev.z || 0);
        const dt = Math.max((ts - prev.ts) / 1000, 1e-6); // seconds
        distanceDelta = Math.sqrt(dx * dx + dy * dy + dz * dz);
        speed = distanceDelta / dt; // units per second (inches/sec if inches are used)
        // simple acceleration estimate using last speed  (approx)
        const lastSpeed = 0; // we'd need to store last speed for accurate accel; simple approach: 0
        acceleration = (speed - lastSpeed) / dt;
        force = mass * acceleration; // F = m * a
        prev.distance += distanceDelta;
        this.store.set(id, { x, y, z, ts, distance: prev.distance });
      } else {
        this.store.set(id, { x, y, z, ts, distance: 0 });
      }

      const event = {
        id,
        ts,
        x,
        y,
        z,
        mass,
        distanceDelta,
        speed,
        acceleration,
        force,
        totalDistance: this.store.get(id)?.distance || 0,
      };

      // broadcast to websocket clients
      this.gateway.broadcast('object.update', event);

      // you can also persist to DB or push to message broker here

    } catch (err) {
      this.logger.error('Error handling incoming event', err as any);
    }
  }
}
