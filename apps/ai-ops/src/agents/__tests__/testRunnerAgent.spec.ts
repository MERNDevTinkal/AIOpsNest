import { TestRunnerAgent } from '../testRunnerAgent';
import * as shell from '../../lib/shell';
import { describe, it, expect, beforeEach, spyOn } from 'bun:test';

describe('TestRunnerAgent', () => {
  let agent: TestRunnerAgent;

  beforeEach(() => {
    agent = new TestRunnerAgent();
  });

  it('returns not-applicable for non-test alerts', async () => {
    const res = await agent.evaluate({ type: 'lint' });
    expect(res.approved).toBe(false);
    expect(res.message).toBe('not-applicable');
  });

  it('approves test-failure alerts when all tests pass', async () => {
    const mockOutput = JSON.stringify({
      numPassedTests: 5,
      numFailedTests: 0,
      success: true,
    });
    const runCommandSpy = spyOn(shell, 'runCommand').mockResolvedValue(mockOutput);

    const res = await agent.evaluate({ type: 'test-failure' });

    expect(res.approved).toBe(true);
    expect(res.message).toBe('all-tests-passed: 5 passed');
    expect(runCommandSpy).toHaveBeenCalledWith('npm', ['test', '--', '--json', '--watchAll=false']);
    runCommandSpy.mockRestore();
  });

  it('rejects test-failure alerts when tests fail', async () => {
    const mockOutput = JSON.stringify({
      numPassedTests: 3,
      numFailedTests: 2,
      success: false,
    });
    const runCommandSpy = spyOn(shell, 'runCommand').mockResolvedValue(mockOutput);

    const res = await agent.evaluate({ type: 'test-failure' });

    expect(res.approved).toBe(false);
    expect(res.message).toBe('tests-failed: 2 failed, 3 passed');
    runCommandSpy.mockRestore();
  });

  it('handles shell command failures with JSON output in stdout', async () => {
    const mockStdout = JSON.stringify({
      numPassedTests: 1,
      numFailedTests: 4,
      success: false,
    });
    const error = new Error('Command failed');
    (error as any).stdout = mockStdout;
    const runCommandSpy = spyOn(shell, 'runCommand').mockRejectedValue(error);

    const res = await agent.evaluate({ type: 'test-failure' });

    expect(res.approved).toBe(false);
    expect(res.message).toBe('tests-failed: 4 failed, 1 passed');
    runCommandSpy.mockRestore();
  });

  it('handles shell command failures without JSON output', async () => {
    const runCommandSpy = spyOn(shell, 'runCommand').mockRejectedValue(new Error('Spawn failed'));

    const res = await agent.evaluate({ type: 'test-failure' });

    expect(res.approved).toBe(false);
    expect(res.message).toBe('execution-error: Spawn failed');
    runCommandSpy.mockRestore();
  });
});