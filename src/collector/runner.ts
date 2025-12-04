import { exec } from "@actions/exec";

export interface CommandResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  durationMs: number;
}

export async function runCommand(
  command: string,
  env: Record<string, string>,
  timeoutMs = 60000,
  silent = false
): Promise<CommandResult> {
  const startTime = Date.now();
  let stdout = "";
  let stderr = "";

  // Transform @collect commands to CLI invocations
  let commandToRun = command;
  if (command.trim().startsWith("@collect ")) {
    const collectArgs = command.trim().slice("@collect ".length);
    commandToRun = `bun src/index.ts collect ${collectArgs}`;
  }

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Command timed out")), timeoutMs);
    });

    // Create the execution promise
    const execPromise = exec("sh", ["-c", commandToRun], {
      env: { ...(process.env as Record<string, string>), ...env },
      ignoreReturnCode: true,
      silent,
      listeners: {
        stdout: (data: Buffer) => {
          stdout += data.toString();
        },
        stderr: (data: Buffer) => {
          stderr += data.toString();
        },
      },
    });

    // Race between execution and timeout
    const exitCode = await Promise.race([execPromise, timeoutPromise]);

    const durationMs = Date.now() - startTime;
    const timedOut = false;

    return {
      success: exitCode === 0 && !timedOut,
      stdout,
      stderr,
      exitCode: exitCode ?? -1,
      timedOut,
      durationMs,
    };
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const timedOut = errorMessage.includes("timed out");

    return {
      success: false,
      stdout,
      stderr: errorMessage,
      exitCode: -1,
      timedOut,
      durationMs,
    };
  }
}
