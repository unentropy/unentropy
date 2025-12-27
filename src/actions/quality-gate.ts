import * as core from "@actions/core";
import * as github from "@actions/github";
import { loadConfig } from "../config/loader.js";
import { Storage } from "../storage/storage.js";
import { collectMetrics } from "../collector/collector.js";
import type { StorageConfig } from "../config/schema.js";
import type { StorageProviderConfig } from "../storage/providers/interface.js";
import { formatValue, formatDelta } from "../metrics/unit-formatter.js";
import type { UnitType } from "../metrics/types.js";
import { evaluateQualityGate, buildMetricSamples } from "../quality-gate/index.js";
import type { QualityGateResult } from "../quality-gate/index.js";
import type { QualityGateConfig } from "../config/schema.js";

// ============================================================================
// GitHub Action Entrypoint
// ============================================================================

function determineReferenceBranch(config: { qualityGate?: QualityGateConfig }): string {
  const contextBase = process.env.GITHUB_BASE_REF;
  return config.qualityGate?.baseline?.referenceBranch ?? contextBase ?? "main";
}

interface QualityGateInputs {
  storageType: string;
  configFile: string;
  databaseKey: string;
  s3Endpoint?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKeyId?: string;
  s3SecretAccessKey?: string;
  qualityGateMode?: string;
  enablePrComment?: boolean;
  prCommentMarker?: string;
  maxPrCommentMetrics?: number;
}

function parseInputs(): QualityGateInputs {
  const storageType = core.getInput("storage-type") || "sqlite-s3";
  const configFile = core.getInput("config-file") || "unentropy.json";
  const databaseKey = core.getInput("database-key") || "unentropy.db";

  const s3Endpoint = core.getInput("s3-endpoint");
  const s3Bucket = core.getInput("s3-bucket");
  const s3Region = core.getInput("s3-region");
  const s3AccessKeyId = core.getInput("s3-access-key-id");
  const s3SecretAccessKey = core.getInput("s3-secret-access-key");

  const qualityGateMode = core.getInput("quality-gate-mode");
  const enablePrCommentInput = core.getInput("enable-pr-comment");
  const prCommentMarkerInput = core.getInput("pr-comment-marker");
  const maxPrCommentMetricsInput = core.getInput("max-pr-comment-metrics");

  const enablePrComment = enablePrCommentInput
    ? enablePrCommentInput.toLowerCase() === "true"
    : true;
  const prCommentMarker = prCommentMarkerInput || "<!-- unentropy-quality-gate -->";
  const maxPrCommentMetrics = maxPrCommentMetricsInput
    ? parseInt(maxPrCommentMetricsInput, 10)
    : 30;

  if (storageType === "sqlite-s3") {
    if (!s3AccessKeyId || !s3SecretAccessKey) {
      throw new Error("S3 storage requires s3-access-key-id and s3-secret-access-key inputs");
    }
  }

  return {
    storageType,
    configFile,
    databaseKey,
    s3Endpoint,
    s3Bucket,
    s3Region,
    s3AccessKeyId,
    s3SecretAccessKey,
    qualityGateMode,
    enablePrComment,
    prCommentMarker,
    maxPrCommentMetrics,
  };
}

function createStorageConfig(
  inputs: QualityGateInputs,
  config: StorageConfig,
  referenceBranch: string
): StorageProviderConfig {
  if (config.type === "sqlite-s3") {
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

  if (config.type === "sqlite-local") {
    return {
      type: "sqlite-local",
      path: inputs.databaseKey,
    };
  }

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
    branchFilter: referenceBranch,
    token,
    repository,
  };
}

async function createQualityGateComment(
  gateResult: QualityGateResult,
  marker: string,
  maxMetrics: number
): Promise<string | null> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    core.warning("GITHUB_TOKEN not available, skipping PR comment");
    return null;
  }

  const octokit = github.getOctokit(token);
  const context = github.context;

  if (!context.payload.pull_request) {
    core.warning("Not in a pull request context, skipping comment");
    return null;
  }

  const { owner, repo } = context.repo;
  const pull_number = context.payload.pull_request.number;

  let commentBody = `${marker}\n\n`;

  const formatDeltaWithZero = (delta: number | undefined, unit: UnitType | undefined): string => {
    if (delta === undefined) return "N/A";
    if (delta === 0) return "-";
    return formatDelta(delta, unit as UnitType);
  };

  const hasBaseline = gateResult.metrics.some((m) => m.baseline !== undefined);
  if (gateResult.summary.totalMetrics === 0 || !hasBaseline) {
    commentBody += `## 🛡️ Quality Gate: **UNKNOWN** ⚠️\n\n`;
    commentBody += `### No Baseline Data Available\n\n`;
    commentBody += `This appears to be the first pull request, or baseline data is not yet available.\n`;
    commentBody += `Metrics were collected successfully, but there's no reference baseline to compare against.\n\n`;

    if (gateResult.metrics.length > 0) {
      commentBody += `**Collected Metrics** (${gateResult.metrics.length}):\n`;
      for (const metric of gateResult.metrics.slice(0, 5)) {
        if (metric.pullRequestValue !== undefined) {
          commentBody += `- ${metric.metric}: ${formatValue(metric.pullRequestValue, metric.unit as UnitType)}\n`;
        }
      }
      if (gateResult.metrics.length > 5) {
        commentBody += `\n_...and ${gateResult.metrics.length - 5} more metrics_\n`;
      }
    }

    commentBody += `\nOnce the main branch has metrics data, future PRs will be evaluated against that baseline.\n`;
  } else {
    const statusBadge =
      gateResult.status === "pass"
        ? "**PASS** ✅"
        : gateResult.status === "fail"
          ? "**FAIL** ❌"
          : "**UNKNOWN** ⚠️";

    commentBody += `## 🛡️ Quality Gate: ${statusBadge}\n\n`;

    const evaluatedMetrics = gateResult.metrics.filter((m) => m.threshold !== undefined);
    const trackedMetrics = gateResult.metrics.filter((m) => m.threshold === undefined);

    if (evaluatedMetrics.length > 0) {
      commentBody += `| Metric | Base | PR | Δ |\n`;
      commentBody += "|--------|------|-----|---|\n";

      const metricsToShow = evaluatedMetrics.slice(0, maxMetrics);
      for (const metric of metricsToShow) {
        const statusIcon = metric.status === "pass" ? "✅" : metric.status === "fail" ? "❌" : "⚠️";
        const baselineStr =
          metric.baseline !== undefined
            ? formatValue(metric.baseline, metric.unit as UnitType)
            : "N/A";
        const prStr =
          metric.pullRequestValue !== undefined
            ? formatValue(metric.pullRequestValue, metric.unit as UnitType)
            : "N/A";
        const deltaStr = formatDeltaWithZero(metric.absoluteDelta, metric.unit as UnitType);

        commentBody += `| ${statusIcon} ${metric.metric} | ${baselineStr} | ${prStr} | ${deltaStr} |\n`;
      }

      if (evaluatedMetrics.length > maxMetrics) {
        commentBody += `\n_...and ${evaluatedMetrics.length - maxMetrics} more evaluated metrics_\n`;
      }

      commentBody += "\n";
      const passIcon = gateResult.summary.passed > 0 ? "✅" : "";
      const failIcon = gateResult.summary.failed > 0 ? "❌" : "";
      commentBody += `${passIcon} **${gateResult.summary.passed} passed** • ${failIcon} **${gateResult.summary.failed} failed**\n\n`;
    }

    if (trackedMetrics.length > 0) {
      commentBody += "<details>\n";
      commentBody += "<summary>Other tracked metrics (no thresholds configured)</summary>\n\n";
      commentBody += "| Metric | Base | PR | Δ |\n";
      commentBody += "|--------|------|-----|---|\n";

      for (const metric of trackedMetrics) {
        const baselineStr =
          metric.baseline !== undefined
            ? formatValue(metric.baseline, metric.unit as UnitType)
            : "N/A";
        const prStr =
          metric.pullRequestValue !== undefined
            ? formatValue(metric.pullRequestValue, metric.unit as UnitType)
            : "N/A";
        const deltaStr = formatDeltaWithZero(metric.absoluteDelta, metric.unit as UnitType);

        commentBody += `| ${metric.metric} | ${baselineStr} | ${prStr} | ${deltaStr} |\n`;
      }

      commentBody += "\n</details>\n\n";
    }
  }

  commentBody += `---\n`;
  commentBody += `<details>\n<summary>About this check</summary>\n\n`;
  commentBody += `**Mode**: ${gateResult.mode} • **Reference**: ${gateResult.baselineInfo.referenceBranch}\n\n`;
  commentBody += `Powered by [Unentropy](https://unentropy.dev)\n`;
  commentBody += `</details>\n`;

  try {
    const existingComments = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: pull_number,
      per_page: 100,
    });

    const existingComment = existingComments.data.find((comment) => comment.body?.includes(marker));

    let commentUrl: string;

    if (existingComment) {
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      commentUrl = existingComment.html_url;
      core.info("Updated existing PR comment");
    } else {
      const response = await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: commentBody,
      });
      commentUrl = response.data.html_url;
      core.info("Created new PR comment");
    }

    return commentUrl;
  } catch (error) {
    core.warning(
      `Failed to post PR comment: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}

export async function runQualityGateAction(): Promise<void> {
  const startTime = Date.now();

  try {
    const inputs = parseInputs();
    core.info(`Starting quality gate action with storage: ${inputs.storageType}`);

    const config = await loadConfig(inputs.configFile);
    core.info(
      `Configuration loaded successfully with ${Object.keys(config.metrics).length} metrics`
    );

    const gateMode = (inputs.qualityGateMode ?? config.qualityGate?.mode ?? "soft") as
      | "off"
      | "soft"
      | "hard";
    core.info(`Quality gate mode: ${gateMode}`);

    if (gateMode === "off") {
      core.info("Quality gate disabled (mode: off)");
      core.setOutput("quality-gate-status", "unknown");
      core.setOutput("quality-gate-mode", "off");
      return;
    }

    const referenceBranch = determineReferenceBranch(config);
    const maxAgeDays = config.qualityGate?.baseline?.maxAgeDays ?? 90;

    core.info("Downloading baseline database...");
    const storageConfig = createStorageConfig(inputs, config.storage, referenceBranch);
    const storage = new Storage(storageConfig);
    await storage.ready();
    core.info("Baseline database downloaded successfully");

    const repository = storage.getRepository();

    core.info("Collecting metrics for current PR...");
    const collectionResult = await collectMetrics(config.metrics);
    core.info(
      `Metrics collection completed: ${collectionResult.successful}/${collectionResult.total} successful`
    );

    core.info(
      `Building metric samples (reference: ${referenceBranch}, maxAgeDays: ${maxAgeDays})...`
    );
    const samples = buildMetricSamples(
      collectionResult.collectedMetrics,
      repository,
      referenceBranch,
      maxAgeDays
    );

    core.info("Evaluating quality gate...");
    const gateResult = evaluateQualityGate(
      samples,
      { ...config.qualityGate, mode: gateMode },
      {
        referenceBranch,
        maxAgeDays,
      }
    );

    core.info(`Quality gate evaluation complete: ${gateResult.status}`);
    if (gateResult.failingMetrics.length > 0) {
      core.warning(`${gateResult.failingMetrics.length} metrics failed thresholds`);
      for (const metric of gateResult.failingMetrics) {
        core.warning(`  - ${metric.metric}: ${metric.message}`);
      }
    }

    let commentUrl: string | undefined;
    if (inputs.enablePrComment) {
      core.info("Creating/updating PR comment...");
      const url = await createQualityGateComment(
        gateResult,
        inputs.prCommentMarker || "<!-- unentropy-quality-gate -->",
        inputs.maxPrCommentMetrics || 30
      );
      if (url) {
        commentUrl = url;
        core.info(`PR comment created: ${commentUrl}`);
      }
    }

    core.setOutput("quality-gate-status", gateResult.status);
    core.setOutput("quality-gate-mode", gateResult.mode);
    core.setOutput(
      "quality-gate-failing-metrics",
      gateResult.failingMetrics.map((m) => m.metric).join(",")
    );
    if (commentUrl) {
      core.setOutput("quality-gate-comment-url", commentUrl);
    }
    core.setOutput("metrics-collected", collectionResult.successful);
    core.setOutput("baseline-reference-branch", referenceBranch);

    await storage.close();

    if (gateMode === "hard" && gateResult.status === "fail") {
      const blockingCount = gateResult.failingMetrics.filter((m) => m.isBlocking).length;
      if (blockingCount > 0) {
        const message =
          `Quality gate failed: ${blockingCount} blocking threshold violations\n` +
          gateResult.failingMetrics
            .filter((m) => m.isBlocking)
            .map((m) => `  - ${m.metric}: ${m.message}`)
            .join("\n");
        core.setFailed(message);
        process.exit(1);
      }
    }

    const duration = Date.now() - startTime;
    core.info(`Quality gate action completed successfully in ${duration}ms`);
  } catch (error) {
    core.setFailed(
      `Quality gate action failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

if (import.meta.main) {
  runQualityGateAction().catch((error) => {
    core.setFailed(`Unhandled error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
