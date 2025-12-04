import { z } from "zod";

export const UnitTypeSchema = z.enum(["percent", "integer", "bytes", "duration", "decimal"], {
  message: "unit must be one of: percent, integer, bytes, duration, decimal",
});

export const ResolvedMetricConfigSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/, {
      message: "name must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)",
    }),
  type: z.enum(["numeric", "label"], {
    message: "type must be either 'numeric' or 'label'",
  }),
  description: z.string().max(256).optional(),
  command: z.string().min(1, { message: "command cannot be empty" }).max(1024),
  unit: UnitTypeSchema.optional(),
  timeout: z.number().int().positive().max(300000).optional(),
});

export const MetricConfigSchema = z
  .object({
    $ref: z.string().optional(),
    name: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9-]+$/, {
        message: "name must be lowercase with hyphens only (pattern: ^[a-z0-9-]+$)",
      })
      .optional(),
    type: z
      .enum(["numeric", "label"], {
        message: "type must be either 'numeric' or 'label'",
      })
      .optional(),
    description: z.string().max(256).optional(),
    command: z.string().min(1, { message: "command cannot be empty" }).max(1024, {
      message: "command must be 1024 characters or less",
    }),
    unit: UnitTypeSchema.optional(),
    timeout: z.number().int().positive().max(300000).optional(),
  })
  .strict()
  .refine(
    (data) => {
      // command is always required (enforced by schema above)
      // If using $ref, only command is required
      if (data.$ref) {
        return true;
      }
      // If not using $ref, name, type, and command are all required
      return data.name && data.type && data.command;
    },
    {
      message: "Metric must either have $ref with command, or provide name, type, and command",
    }
  );

export const StorageConfigSchema = z
  .object({
    type: z.enum(["sqlite-local", "sqlite-artifact", "sqlite-s3"], {
      message: "must be one of 'sqlite-local', 'sqlite-artifact', or 'sqlite-s3'",
    }),
  })
  .strict();

export const MetricThresholdConfigSchema = z
  .object({
    metric: z.string().min(1, { message: "metric field is required" }),
    mode: z.enum(["no-regression", "min", "max", "delta-max-drop"], {
      message: "mode must be one of: no-regression, min, max, delta-max-drop",
    }),
    target: z.number().optional(),
    tolerance: z.number().min(0, { message: "tolerance must be non-negative" }).optional(),
    maxDropPercent: z.number().positive({ message: "maxDropPercent must be positive" }).optional(),
    severity: z
      .enum(["warning", "blocker"], {
        message: "severity must be either 'warning' or 'blocker'",
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) => {
      if (data.mode === "min" || data.mode === "max") {
        return data.target !== undefined;
      }
      return true;
    },
    {
      message: "target is required when mode is 'min' or 'max'",
    }
  )
  .refine(
    (data) => {
      if (data.mode === "delta-max-drop") {
        return data.maxDropPercent !== undefined;
      }
      return true;
    },
    {
      message: "maxDropPercent is required when mode is 'delta-max-drop'",
    }
  );

export const BaselineConfigSchema = z
  .object({
    referenceBranch: z.string().optional(),
    maxAgeDays: z.number().int().positive().optional(),
  })
  .strict();

export const QualityGateConfigSchema = z
  .object({
    mode: z
      .enum(["off", "soft", "hard"], {
        message: "mode must be one of: off, soft, hard",
      })
      .optional(),
    enablePullRequestComment: z.boolean().optional(),
    maxCommentMetrics: z.number().int().min(1).max(100).optional(),
    maxCommentCharacters: z.number().int().positive().max(20000).optional(),
    baseline: BaselineConfigSchema.optional(),
    thresholds: z.array(MetricThresholdConfigSchema).optional(),
  })
  .strict();

export const UnentropyConfigSchema = z
  .object({
    storage: StorageConfigSchema.optional(),
    metrics: z
      .array(MetricConfigSchema)
      .min(1, { message: "metrics array must contain at least one metric" })
      .max(50),
    qualityGate: QualityGateConfigSchema.optional(),
  })
  .strict()
  .transform((data) => ({
    ...data,
    storage: data.storage || { type: "sqlite-local" },
  }));

export type MetricConfig = z.infer<typeof MetricConfigSchema>;
export type ResolvedMetricConfig = z.infer<typeof ResolvedMetricConfigSchema>;
export type StorageConfig = z.infer<typeof StorageConfigSchema>;
export type MetricThresholdConfig = z.infer<typeof MetricThresholdConfigSchema>;
export type BaselineConfig = z.infer<typeof BaselineConfigSchema>;
export type QualityGateConfig = z.infer<typeof QualityGateConfigSchema>;
export type UnentropyConfig = z.infer<typeof UnentropyConfigSchema>;

export function validateConfig(config: unknown): UnentropyConfig {
  const result = UnentropyConfigSchema.safeParse(config);

  if (!result.success) {
    const firstIssue = result.error.issues[0];
    let errorMessage = firstIssue?.message || "Validation error";

    // Improve error message for missing command field
    if (firstIssue?.code === "invalid_type" && firstIssue?.path?.includes("command")) {
      errorMessage =
        "command field is required for all metrics. Built-in metrics are templates only and do not provide commands.";
    }

    throw new Error(errorMessage);
  }

  const metricNames = new Set<string>();
  for (const metric of result.data.metrics) {
    if (metric.name) {
      if (metricNames.has(metric.name)) {
        throw new Error(
          `Duplicate metric name "${metric.name}" found. Metric names must be unique within the configuration`
        );
      }
      metricNames.add(metric.name);
    }
  }

  if (result.data.qualityGate?.thresholds) {
    for (const threshold of result.data.qualityGate.thresholds) {
      if (!metricNames.has(threshold.metric)) {
        throw new Error(
          `Threshold references non-existent metric "${threshold.metric}". Metric must be defined in the metrics array.`
        );
      }
    }
  }

  return result.data;
}
