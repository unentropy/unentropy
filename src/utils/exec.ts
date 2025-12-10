import { exec } from "@actions/exec";

export async function execCapture(command: string, args: string[] = []): Promise<string> {
  let stdout = "";
  let stderr = "";

  const exitCode = await exec(command, args, {
    listeners: {
      stdout: (data: Buffer) => {
        stdout += data.toString();
      },
      stderr: (data: Buffer) => {
        stderr += data.toString();
      },
    },
    silent: true,
  });

  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}: ${stderr || stdout}`);
  }

  return stdout;
}
