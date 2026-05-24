#!/usr/bin/env bun

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

type VersionType = "patch" | "minor" | "major";

function execPipe(command: string): string {
  return execSync(command, { encoding: "utf-8", stdio: "pipe" }).trim();
}

function execInherit(command: string): void {
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

function bumpVersion(type: VersionType): string {
  execInherit(`bun pm version ${type} --no-git-tag-version --force`);
  return getPackageVersion();
}

function jjCommit(version: string): void {
  execInherit(`jj desc -m "v${version}"`);
}

function gitCommit(version: string): void {
  execPipe(`git add package.json`);
  execInherit(`git commit -m "v${version}"`);
}

function createTag(version: string): void {
  execInherit(`git tag v${version}`);
}

function getJjBookmark(): string {
  const output = execPipe("jj bookmark list");
  const lines = output.split("\n").filter((l) => l.trim());
  const localBookmarks: string[] = [];

  for (const line of lines) {
    const match = line.match(/^([a-zA-Z0-9_-]+):/);
    if (match && !match[1].includes("@")) {
      localBookmarks.push(match[1]);
    }
  }

  for (const name of ["main", "master"]) {
    if (localBookmarks.includes(name)) return name;
  }

  if (localBookmarks.length === 1) return localBookmarks[0];
  if (localBookmarks.length === 0) {
    throw new Error("No local jj bookmark found. Create one with: jj bookmark create main -r @");
  }
  throw new Error(
    `Multiple local jj bookmarks found: ${localBookmarks.join(", ")}. Please specify which one to push.`
  );
}

function jjPush(version: string): void {
  const bookmark = getJjBookmark();
  execInherit(`jj bookmark move ${bookmark} --to @`);
  execInherit(`jj git push -b ${bookmark}`);
  execInherit(`git push origin v${version}`);
}

function gitPush(): void {
  execInherit("git push --follow-tags");
}

function main(): void {
  const type = process.argv[2] as VersionType;
  if (!type || !["patch", "minor", "major"].includes(type)) {
    console.error("Usage: bun run scripts/version.ts <patch|minor|major>");
    process.exit(1);
  }

  const vcs = detectVcs();
  console.log(`Detected VCS: ${vcs}`);

  const version = bumpVersion(type);
  console.log(`Bumped to v${version}`);

  if (vcs === "jj") {
    jjCommit(version);
    createTag(version);
    jjPush(version);
  } else {
    gitCommit(version);
    createTag(version);
    gitPush();
  }

  console.log(`✓ Released v${version}`);
}

main();
