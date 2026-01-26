import { LintFixAgent } from '../lintFixAgent';

describe('LintFixAgent', () => {
  it('returns not-applicable for non-lint alerts', async () => {
    const agent = new LintFixAgent();
    const res = await agent.evaluate({ type: 'other' });
    expect(res.approved).toBe(false);
    expect(res.message).toBe('not-applicable');
  });

  it('approves lint alerts and simulates fix', async () => {
    const agent = new LintFixAgent();
    const res = await agent.evaluate({ type: 'lint' });
    expect(res.approved).toBe(true);
    expect(res.message).toMatch(/ran-fix/);
  });
});