import { spawn } from 'child_process';

/**
 * Executes a shell command securely using child_process.spawn with shell: false.
 * @param command The command to execute.
 * @param args Array of arguments for the command.
 * @returns A promise that resolves with stdout or rejects with an error.
 */
export function runCommand(command: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: false,
      cwd: process.cwd(),
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        const error = new Error(`Command failed with code ${code}`);
        (error as any).stdout = stdout;
        (error as any).stderr = stderr;
        (error as any).code = code;
        reject(error);
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}
