import { createPrFromBranch } from '../lib/prBuilder';

describe('prBuilder', () => {
  it('returns a PR representation', async () => {
    const res = await createPrFromBranch('fix-branch', 'Fix', 'Body');
    expect(res).toMatch(/PR\(fix-branch\): Fix/);
  });
});