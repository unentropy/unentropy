import * as core from "@actions/core";
import { loadConfig } from "../config/loader";
import { Storage } from "../storage/storage";
import { collectMetrics } from "../collector/collector";
import { extractBuildContext } from "../collector/context";

import type { StorageProviderConfig } from "../storage/providers/interface";

interface ActionInputs {
  storageType: string;
  configFile: string;
  databaseKey: string;
  reportDir: string;
  // S3 configuration
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  s3SessionToken?: string;
  // Artifact configuration
  artifactName?: string;
  artifactBranchFilter?: string;
  // General options
  timeout?: number;
  retryAttempts?: number;
  verbose?: boolean;
}

interface ActionOutputs {
  success: boolean;
  storageType: string;
  databaseLocation: string;
  databaseSize?: number;
  metricsCollected?: number;
  totalBuilds?: number;
  duration: number;
  // Artifact upload metadata (sqlite-artifact only)
  artifactUploadRequired?: boolean;
  artifactName?: string;
  artifactPath?: string;
  // Error outputs
  errorCode?: string;
  errorMessage?: string;
}

function parseInputs(): ActionInputs {
  const storageType = core.getInput("storage-type") || "sqlite-local";
  const configFile = core.getInput("config-file") || "unentropy.json";
  const databaseKey = core.getInput("database-key") || "unentropy-metrics.db";
  const reportDir = core.getInput("report-dir") || "unentropy-report";

  // S3 configuration (optional for non-S3 storage types)
  const s3Endpoint = core.getInput("s3-endpoint");
  const s3Bucket = core.getInput("s3-bucket");
  const s3Region = core.getInput("s3-region");
  const s3AccessKeyId = core.getInput("s3-access-key-id");
  const s3SecretAccessKey = core.getInput("s3-secret-access-key");
  const s3SessionToken = core.getInput("s3-session-token");

  // Artifact configuration (for sqlite-artifact storage type)
  const artifactName = core.getInput("artifact-name") || "unentropy-metrics";
  const artifactBranchFilter =
    core.getInput("artifact-branch-filter") || process.env.GITHUB_REF_NAME || "main";

  // Optional parameters
  const timeoutInput = core.getInput("timeout");
  const retryAttemptsInput = core.getInput("retry-attempts");
  const verboseInput = core.getInput("verbose");

  const timeout = timeoutInput ? parseInt(timeoutInput, 10) : undefined;
  const retryAttempts = retryAttemptsInput ? parseInt(retryAttemptsInput, 10) : undefined;
  const verbose = verboseInput ? verboseInput.toLowerCase() === "true" : false;

  // Validate storage type
  const validStorageTypes = ["sqlite-local", "sqlite-artifact", "sqlite-s3"];
  if (!validStorageTypes.includes(storageType)) {
    throw new Error(
      `Invalid storage-type: must be one of ${validStorageTypes.join(", ")}. Got: ${storageType}`
    );
  }

  // Validate S3 requirements for S3 storage
  if (storageType === "sqlite-s3") {
    if (!s3AccessKeyId || !s3SecretAccessKey) {
      throw new Error("S3 storage requires s3-access-key-id and s3-secret-access-key inputs");
    }
  }

  return {
    storageType,
    configFile,
    databaseKey,
    reportDir,
    s3Endpoint,
    s3Bucket,
    s3Region,
    s3AccessKeyId,
    s3SecretAccessKey,
    s3SessionToken,
    artifactName,
    artifactBranchFilter,
    timeout,
    retryAttempts,
    verbose,
  };
}

function createStorageConfig(inputs: ActionInputs): StorageProviderConfig {
  // Use inputs.storageType (from action input) - it determines which provider to use
  const storageType = inputs.storageType;

  // For sqlite-s3, merge S3 configuration from inputs
  if (storageType === "sqlite-s3") {
    return {
      type: "sqlite-s3",
      endpoint: inputs.s3Endpoint,
      bucket: inputs.s3Bucket,
      region: inputs.s3Region,
      accessKeyId: inputs.s3AccessKeyId,
      secretAccessKey: inputs.s3SecretAccessKey,
      databaseKey: inputs.databaseKey,
    };
  }

  // For sqlite-local, use database key as path
  if (storageType === "sqlite-local") {
    return {
      type: "sqlite-local",
      path: inputs.databaseKey,
    };
  }

  // For sqlite-artifact, use artifact configuration
  const token = process.env.GITHUB_TOKEN;
  const repository = process.env.GITHUB_REPOSITORY;

  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required for artifact storage");
  }
  if (!repository) {
    throw new Error("GITHUB_REPOSITORY environment variable is required for artifact storage");
  }

  return {
    type: "sqlite-artifact",
    artifactName: inputs.artifactName,
    branchFilter: inputs.artifactBranchFilter,
    databasePath: inputs.databaseKey,
    token,
    repository,
  };
}

export async function runTrackMetricsAction(): Promise<void> {
  const startTime = Date.now();

  // Parse and validate inputs
  const inputs = parseInputs();
  core.info(`Starting unified track-metrics action with storage: ${inputs.storageType}`);

  if (inputs.verbose) {
    core.info(`Configuration file: ${inputs.configFile}`);
    core.info(`Database key: ${inputs.databaseKey}`);
    core.info(`Report directory: ${inputs.reportDir}`);
  }

  // Load configuration
  const config = await loadConfig(inputs.configFile);
  core.info(`Configuration loaded successfully with ${Object.keys(config.metrics).length} metrics`);

  // Phase 1: Initialize storage
  core.info("Initializing storage provider...");
  const storageConfig = createStorageConfig(inputs);
  const storage = new Storage(storageConfig);
  await storage.ready();
  core.info("Storage provider initialized successfully");

  // Phase 2: Collect metrics
  core.info("Collecting metrics...");
  const context = extractBuildContext();
  const repository = storage.getRepository();

  // Collect metrics (doesn't write to DB yet)
  const collectionResult = await collectMetrics(config.metrics);

  // Record build with all collected metrics in one operation
  await repository.recordBuild(context, collectionResult.collectedMetrics);

  core.info(
    `Metrics collection completed: ${collectionResult.successful}/${collectionResult.total} successful`
  );

  if (collectionResult.failed > 0) {
    core.warning(`${collectionResult.failed} metrics failed to collect`);
    for (const failure of collectionResult.failures) {
      core.warning(`  ${failure.metricName}: ${failure.reason}`);
    }
  }

  // Phase 3: Generate report (before closing database)
  core.info("Generating HTML report...");
  try {
    const { generateReport } = await import("../reporter/generator");
    const reportHtml = generateReport(
      process.env.GITHUB_REPOSITORY || "unknown/repository",
      storage,
      config
    );

    // Create report directory and write index.html
    await Bun.write(`${inputs.reportDir}/index.html`, reportHtml);
    core.info(`Report generated: ${inputs.reportDir}/index.html`);
  } catch (error) {
    core.warning(
      `Report generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    // Continue anyway - report generation failure shouldn't fail the whole action
  }

  // Get total builds count before persisting (while DB is still open)
  const totalBuilds = repository.getAllBuildContexts().length;

  // Phase 4: Persist storage (upload for S3/artifact)
  // This closes the database for S3/artifact providers, so must happen after report generation
  core.info("Persisting database to storage...");
  await storage.persist();

  // Get database size after persist
  let databaseSize: number | undefined;
  try {
    const dbFile = Bun.file(inputs.databaseKey);
    if (await dbFile.exists()) {
      databaseSize = dbFile.size;
    }
  } catch {
    // Ignore errors getting file size
  }

  const duration = Date.now() - startTime;

  // Set outputs
  const outputs: ActionOutputs = {
    success: true,
    storageType: inputs.storageType,
    databaseLocation: `storage://${inputs.storageType}/${inputs.databaseKey}`,
    databaseSize,
    metricsCollected: collectionResult.successful,
    totalBuilds,
    duration,
  };

  core.setOutput("success", outputs.success.toString());
  core.setOutput("storage-type", outputs.storageType);
  core.setOutput("database-location", outputs.databaseLocation);
  if (outputs.databaseSize !== undefined) {
    core.setOutput("database-size", outputs.databaseSize.toString());
  }
  if (outputs.metricsCollected !== undefined) {
    core.setOutput("metrics-collected", outputs.metricsCollected.toString());
  }
  if (outputs.totalBuilds !== undefined) {
    core.setOutput("total-builds", outputs.totalBuilds.toString());
  }
  core.setOutput("duration", outputs.duration.toString());

  // Set artifact upload metadata for composite action step (sqlite-artifact only)
  if (inputs.storageType === "sqlite-artifact") {
    core.setOutput("artifact-upload-required", "true");
    core.setOutput("artifact-name", inputs.artifactName);
    core.setOutput("artifact-path", inputs.databaseKey);
  } else {
    core.setOutput("artifact-upload-required", "false");
  }

  core.info("Track-metrics action completed successfully");

  // Cleanup
  await storage.close();
}

// Run the action if this file is executed directly
if (import.meta.main) {
  runTrackMetricsAction().catch((error) => {
    core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
