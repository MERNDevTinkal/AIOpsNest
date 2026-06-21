import { runCommand } from '../lib/shell';

export class TestRunnerAgent {
  id = 'test-runner-agent';

  async evaluate(alert: any) {
    // If test failures are reported, try to run tests and see outcome
    if (!alert || !alert.type || alert.type !== 'test-failure') {
      return { approved: false, message: 'not-applicable' };
    }

    try {
      // In a real env, we'd run npm test with JSON output
      // For this implementation, we simulate it by running the command and parsing output
      const output = await runCommand('npm', ['test', '--', '--json', '--watchAll=false']);
      const results = this.parseJestOutput(output);

      if (results.numFailedTests === 0 && results.numPassedTests > 0) {
        return { approved: true, message: `all-tests-passed: ${results.numPassedTests} passed` };
      }

      return {
        approved: false,
        message: `tests-failed: ${results.numFailedTests} failed, ${results.numPassedTests} passed`,
      };
    } catch (err: any) {
      // If npm test fails (non-zero exit code), it might still provide JSON output in stdout
      if (err.stdout) {
        try {
          const results = this.parseJestOutput(err.stdout);
          return {
            approved: false,
            message: `tests-failed: ${results.numFailedTests} failed, ${results.numPassedTests} passed`,
          };
        } catch (parseErr) {
          // Fallback if parsing fails
        }
      }
      return { approved: false, message: `execution-error: ${err.message}` };
    }
  }

  private parseJestOutput(output: string) {
    try {
      // Jest might output some non-JSON text before the actual JSON
      const jsonStart = output.indexOf('{');
      if (jsonStart === -1) throw new Error('No JSON found in output');
      const jsonStr = output.substring(jsonStart);
      const data = JSON.parse(jsonStr);

      return {
        numPassedTests: data.numPassedTests || 0,
        numFailedTests: data.numFailedTests || 0,
        success: data.success || false,
      };
    } catch (err) {
      throw new Error('Failed to parse Jest output');
    }
  }
}
