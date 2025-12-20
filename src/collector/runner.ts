import { exec } from "@actions/exec";
import { executeCollect } from "./collect-runner";

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

  if (command.trim().startsWith("@collect ")) {
    const collectArgs = command.trim().slice("@collect ".length);
    const result = await executeCollect(collectArgs);
    const durationMs = Date.now() - startTime;

    return {
      success: result.success,
      stdout: result.value,
      stderr: result.error || "",
      exitCode: result.success ? 0 : 1,
      timedOut: false,
      durationMs,
    };
  }

  let stdout = "";
  let stderr = "";

  try {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Command timed out")), timeoutMs);
    });

    const execPromise = exec("sh", ["-c", command], {
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
