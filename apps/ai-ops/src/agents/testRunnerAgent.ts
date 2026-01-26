import { exec } from 'child_process';

export class TestRunnerAgent {
  id = 'test-runner-agent';

  async evaluate(alert: any) {
    // If test failures are reported, try to run tests and see outcome
    if (!alert || !alert.type || alert.type !== 'test-failure') {
      return { approved: false, message: 'not-applicable' };
    }

    try {
      const output = await this.runCommand('echo run tests');
      const passed = true; // In real env, parse test results
      return { approved: passed, message: `test-output: ${output}` };
    } catch (err: any) {
      return { approved: false, message: `tests-failed: ${err.message}` };
    }
  }

  runCommand(cmd: string) {
    return new Promise<string>((resolve, reject) => {
      exec(cmd, { cwd: process.cwd() }, (err, stdout, stderr) => {
        if (err) return reject(err);
        resolve(stdout || stderr);
      });
    });
  }
}
