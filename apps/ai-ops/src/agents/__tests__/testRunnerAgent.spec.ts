import { TestRunnerAgent } from '../testRunnerAgent';

describe('TestRunnerAgent', () => {
  it('returns not-applicable for non-test alerts', async () => {
    const agent = new TestRunnerAgent();
    const res = await agent.evaluate({ type: 'lint' });
    expect(res.approved).toBe(false);
    expect(res.message).toBe('not-applicable');
  });

  it('approves test-failure alerts when tests pass', async () => {
    const agent = new TestRunnerAgent();
    const res = await agent.evaluate({ type: 'test-failure' });
    expect(res.approved).toBe(true);
    expect(res.message).toMatch(/test-output/);
  });
});