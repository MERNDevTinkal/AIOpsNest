import { RealtimeService } from './realtime.service';

const mockGateway = () => ({ broadcast: jest.fn() });

describe('RealtimeService', () => {
  let service: RealtimeService;
  let gateway: any;

  beforeEach(() => {
    gateway = mockGateway();
    service = new RealtimeService(gateway as any);
  });

  it('handles first event (no prev) and stores state', async () => {
    await service.handleIncoming({ id: 'o1', ts: Date.now(), x: 10, y: 20 });
    // expect broadcast called
    expect(gateway.broadcast).toHaveBeenCalledWith('object.update', expect.objectContaining({ id: 'o1' }));
  });

  it('calculates distance and speed on second event', async () => {
    const t1 = Date.now();
    await service.handleIncoming({ id: 'o2', ts: t1, x: 0, y: 0 });
    const t2 = t1 + 1000; // 1 second later
    await service.handleIncoming({ id: 'o2', ts: t2, x: 3, y: 4 }); // distance 5
    expect(gateway.broadcast).toHaveBeenCalledWith('object.update', expect.objectContaining({ id: 'o2', distanceDelta: 5 }));
  });
});
