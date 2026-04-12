import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';

type ObjEvent = {
  id: string;
  x: number;
  y: number;
  z?: number;
  speed: number;
  totalDistance: number;
  ts: number;
};

export default function Realtime() {
  const [objects, setObjects] = useState<Record<string, ObjEvent>>({});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const objectList = useMemo(() => Object.values(objects), [objects]);

  useEffect(() => {
    const socket = io((import.meta.env.VITE_REALTIME_URL as string) || 'http://localhost:4000/realtime');
    socket.on('object.update', (e: any) => {
      setObjects((prev) => ({ ...prev, [e.id]: e }));
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    objectList.forEach((o) => {
      const px = o.x;
      const py = o.y;
      ctx.beginPath();
      ctx.arc(px, py, 8, 0, Math.PI * 2);
      ctx.fillStyle = 'blue';
      ctx.fill();
      ctx.fillStyle = 'black';
      ctx.fillText(`${o.id} s:${o.speed.toFixed(2)} d:${o.totalDistance.toFixed(2)}`, px + 12, py);
    });
  }, [objectList]);

  return (
    <div>
      <h2 className="mb-4">Realtime visualization</h2>
      <canvas ref={canvasRef} width={800} height={600} className="border" />
      <div className="mt-4">
        <h3>Objects</h3>
        <ul>
          {objectList.map((o) => (
            <li key={o.id}>
              {o.id} — speed: {o.speed.toFixed(2)} — distance: {o.totalDistance.toFixed(2)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
