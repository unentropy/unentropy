#!/usr/bin/env bun

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

type VersionType = "patch" | "minor" | "major";

function execPipe(command: string, prefix?: string): string {
  const result = execSync(command, { encoding: "utf-8", stdio: "pipe" }).trim();
  if (prefix && result) {
    const prefixed = result
      .split("\n")
      .map((line) => `  [${prefix}] ${line}`)
      .join("\n");
    console.log(prefixed);
  }
  return result;
}

function execInherit(command: string, prefix: string): void {
  console.log(`  [${prefix}] ${command}`);
  execSync(command, { encoding: "utf-8", stdio: "inherit" });
}

function getPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf-8"));
  return pkg.version;
}

function detectVcs(): "jj" | "git" {
  if (existsSync(resolve(".jj"))) return "jj";
  if (existsSync(resolve(".git"))) return "git";
  throw new Error("No supported VCS found (.jj or .git)");
}

function computeNextVersion(current: string, type: VersionType): string {
  const parts = current.split(".").map(Number);
  const [major, minor, patch] = parts;
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function bumpVersion(type: VersionType): string {
  execInherit(`bun pm version ${type} --no-git-tag-version --force`, "BUN");
  return getPackageVersion();
}

function jjCommit(version: string): void {
  execInherit(`jj desc -m "v${version}"`, "JJ");
}

function jjFinalize(): void {
  execInherit("jj new", "JJ");
}

function gitCommit(version: string): void {
  execPipe("git add package.json", "GIT");
  execInherit(`git commit -m "v${version}"`, "GIT");
}

function createTag(version: string, commitId?: string): void {
  const target = commitId ? commitId : "";
  execInherit(`git tag -f v${version} ${target}`, "GIT");
}

function verifyMainBookmark(): void {
  const output = execPipe("jj bookmark list");
  const hasMain = output.split("\n").some((line) => line.match(/^main:/));
  if (!hasMain) {
    throw new Error(
      "No local jj bookmark 'main' found. Create it with: jj bookmark create main -r @"
    );
  }
}

function jjPush(version: string): void {
  execInherit("git push --force origin main", "GIT");
  execInherit(`git push --force origin v${version}`, "GIT");
  execInherit("jj bookmark move main --to @-", "JJ");
}

function gitPush(version: string): void {
  execInherit("git push", "GIT");
  execInherit(`git push --force origin v${version}`, "GIT");
}

function checkTagExists(version: string): string | null {
  try {
    const tagRef = execPipe(`git rev-parse v${version}`);
    return tagRef || null;
  } catch {
    return null;
  }
}

function printDryRun(type: VersionType, currentVersion: string, vcs: "jj" | "git"): void {
  const nextVersion = computeNextVersion(currentVersion, type);
  console.log(`\n  Current version: ${currentVersion} → Next version: ${nextVersion}\n`);

  const warnings: string[] = [];
  const existingTag = checkTagExists(nextVersion);
  if (existingTag) {
    warnings.push(
      `Tag v${nextVersion} already exists at ${existingTag.substring(0, 7)} — will be force-moved`
    );
  }

  if (vcs === "jj") {
    try {
      verifyMainBookmark();
      const output = execPipe("jj log -r main --no-graph -T 'commit_id'");
      console.log(`  Local bookmark 'main' found at ${output.substring(0, 7)}`);
    } catch {
      throw new Error("Cannot verify main bookmark. Create it with: jj bookmark create main -r @");
    }
  }

  console.log(`\n  Planned actions:`);

  if (vcs === "jj") {
    console.log(`    [BUN] bun pm version ${type} --no-git-tag-version --force`);
    console.log(`    [JJ]  jj desc -m "v${nextVersion}"`);
    console.log(`    [JJ]  jj new`);
    console.log(`    [GIT] git tag -f v${nextVersion} <@-commit-id>`);
    console.log(`    [GIT] git branch -f main <@-commit-id>`);
    console.log(`    [JJ]  jj bookmark move main --to @-`);
    console.log(`    [GIT] git push --force origin main`);
    console.log(`    [GIT] git push --force origin v${nextVersion}`);
    warnings.push("Push to origin/main will be forced");
    warnings.push("Tag push to origin will be forced");
  } else {
    console.log(`    [BUN] bun pm version ${type} --no-git-tag-version --force`);
    console.log(`    [GIT] git add package.json && git commit -m "v${nextVersion}"`);
    console.log(`    [GIT] git tag v${nextVersion}`);
    console.log(`    [GIT] git push`);
    console.log(`    [GIT] git push --force origin v${nextVersion}`);
  }

  if (warnings.length > 0) {
    console.log("");
    for (const warning of warnings) {
      console.log(`  ⚠️  ${warning}`);
    }
  }

  console.log("");
}

function release(type: VersionType, vcs: "jj" | "git"): void {
  if (vcs === "jj") {
    verifyMainBookmark();
  }

  const version = bumpVersion(type);
  console.log(`  Bumped to v${version}\n`);

  if (vcs === "jj") {
    jjCommit(version);
    jjFinalize();
    const commitId = execPipe("jj log -r @- --no-graph -T 'commit_id'");
    createTag(version, commitId);
    execInherit(`git branch -f main ${commitId}`, "GIT");
    jjPush(version);
  } else {
    gitCommit(version);
    createTag(version);
    gitPush(version);
  }

  console.log(`\n  ✓ Released v${version}\n`);
}

function main(): void {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const filteredArgs = args.filter((a) => a !== "--dry-run");
  const type = filteredArgs[0] as VersionType;

  if (!type || !["patch", "minor", "major"].includes(type)) {
    console.error("Usage: bun run scripts/version.ts <patch|minor|major> [--dry-run]");
    process.exit(1);
  }

  const vcs = detectVcs();
  console.log(`\n  Detected VCS: ${vcs}\n`);

  if (dryRun) {
    const currentVersion = getPackageVersion();
    printDryRun(type, currentVersion, vcs);
    process.exit(0);
  }

  release(type, vcs);
}

main();
