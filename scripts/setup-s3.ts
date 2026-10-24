#!/usr/bin/env bun

/**
 * S3 Test Setup
 *
 * Starts an s3s-fs container for S3 testing and provides configuration
 */

import { exec } from "child_process";
import { mkdir, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

const S3_IMAGE = "ghcr.io/s3s-project/s3s:0.17.0";
const S3_PORT = 9000;
const S3_ACCESS_KEY = "test-access-key";
const S3_SECRET_KEY = "test-secret-key";
const S3_BUCKET = "unentropy-test";
const S3_CONTAINER_NAME = "unentropy-test-storage";
const S3_DATA_DIR = join(tmpdir(), S3_CONTAINER_NAME);

async function startS3() {
  console.log("🚀 Starting s3s-fs container...");

  await mkdir(join(S3_DATA_DIR, S3_BUCKET), { recursive: true });

  const dockerCmd = [
    "docker",
    "run",
    "--rm",
    "-d",
    "--name",
    S3_CONTAINER_NAME,
    "--user",
    `${process.getuid?.() ?? 0}:${process.getgid?.() ?? 0}`,
    "-p",
    `${S3_PORT}:8014`,
    "-v",
    `"${S3_DATA_DIR}:/data"`,
    S3_IMAGE,
    "./s3s-fs",
    "--host",
    "0.0.0.0",
    "--port",
    "8014",
    "--access-key",
    S3_ACCESS_KEY,
    "--secret-key",
    S3_SECRET_KEY,
    "/data",
  ];

  try {
    console.log(dockerCmd.join(" "));
    const { stdout } = await execAsync(dockerCmd.join(" "));
    console.log(`✅ s3s-fs container started: ${stdout.trim()}`);

    console.log("⏳ Waiting for s3s-fs to be ready...");
    await waitForS3();

    printTestConfig();
  } catch (error) {
    console.error("❌ Failed to start s3s-fs:", error);
    process.exit(1);
  }
}

async function waitForS3() {
  const maxAttempts = 30;
  const delay = 1000;

  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(`http://localhost:${S3_PORT}`);
      console.log("✅ s3s-fs is ready!");
      return;
    } catch {
      console.log(`⏳ Waiting for s3s-fs... (${i + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error("s3s-fs failed to start after maximum attempts");
}

function printTestConfig() {
  console.log("\n📋 Test Configuration:");
  console.log("========================");
  console.log(`S3_ENDPOINT: http://localhost:${S3_PORT}`);
  console.log(`S3_ACCESS_KEY_ID: ${S3_ACCESS_KEY}`);
  console.log(`S3_SECRET_ACCESS_KEY: ${S3_SECRET_KEY}`);
  console.log(`S3_BUCKET: ${S3_BUCKET}`);
  console.log(`S3_REGION: us-east-1`);
  console.log(`CONTAINER_NAME: ${S3_CONTAINER_NAME}`);
  console.log(`DATA_DIR: ${S3_DATA_DIR}`);
  console.log("\n🧪 Test Commands:");
  console.log("===================");
  console.log("# Start s3s-fs:");
  console.log("bun run scripts/setup-s3.ts start");
  console.log("\n# Stop s3s-fs:");
  console.log("bun run scripts/setup-s3.ts stop");
  console.log("\n# View logs:");
  console.log(`docker logs -f ${S3_CONTAINER_NAME}`);
}

function execAsync(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout: stdout || "", stderr: stderr || "" });
      }
    });
  });
}

const command = process.argv[2];

if (command === "start") {
  startS3();
} else if (command === "stop") {
  await execAsync(`docker stop ${S3_CONTAINER_NAME}`);
  await rm(S3_DATA_DIR, { recursive: true, force: true });
  console.log("✅ s3s-fs container stopped and data removed");
} else {
  console.log("Usage:");
  console.log("  bun run scripts/setup-s3.ts start   # Start s3s-fs container");
  console.log("  bun run scripts/setup-s3.ts stop    # Stop s3s-fs container");
  process.exit(1);
}
