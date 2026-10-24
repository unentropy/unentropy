import { execFileSync } from "node:child_process";

export default function setup(): void {
  execFileSync(process.execPath, ["--import", "tsx", "scripts/build-cli.ts"], { stdio: "inherit" });
}
