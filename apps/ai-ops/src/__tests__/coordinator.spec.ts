import { AiOpsCoordinator } from '../lib/coordinator';
import { LintFixAgent } from '../agents/lintFixAgent';
import { TestRunnerAgent } from '../agents/testRunnerAgent';

describe('AiOpsCoordinator', () => {
  it('collects votes and returns decision', async () => {
    const coord = new AiOpsCoordinator();
    coord.registerAgent(new LintFixAgent());
    coord.registerAgent(new TestRunnerAgent());

    const alert = { type: 'lint' };
    const decision = await coord.handleAlert(alert as any);

    expect(decision).toHaveProperty('approved');
    expect(decision).toHaveProperty('votes');
    expect(Array.isArray(decision.votes)).toBe(true);
    expect(decision.votes.length).toBe(2);
  });
});