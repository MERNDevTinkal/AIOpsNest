import { exec } from 'child_process';

export class LintFixAgent {
  id = 'lint-fix-agent';

  async evaluate(alert: any) {
    // If lint issues are reported in the alert, try to run eslint --fix and report
    if (!alert || !alert.type || alert.type !== 'lint') {
      return { approved: false, message: 'not-applicable' };
    }

    try {
      // Run eslint --fix (dry run in this environment)
      const output = await this.runCommand('echo eslint --fix');
      return { approved: true, message: `ran-fix: ${output}` };
    } catch (err: any) {
      return { approved: false, message: `fix-failed: ${err.message}` };
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
