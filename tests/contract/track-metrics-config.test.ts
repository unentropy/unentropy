import { test, expect } from "bun:test";
import { validateConfig } from "../../src/config/schema";

test("configuration contract: storage.type values and defaults", () => {
  // Test default behavior (no storage block)
  const configWithoutStorage: unknown = {
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  const resultWithoutStorage = validateConfig(configWithoutStorage);
  expect(resultWithoutStorage).toEqual({
    storage: { type: "sqlite-local" },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  });

  // Test explicit sqlite-local storage
  const configWithLocal: unknown = {
    storage: {
      type: "sqlite-local",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  const resultWithLocal = validateConfig(configWithLocal);
  expect(resultWithLocal).toEqual({
    storage: {
      type: "sqlite-local",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  });

  // Test sqlite-artifact storage
  const configWithArtifact: unknown = {
    storage: {
      type: "sqlite-artifact",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  const resultWithArtifact = validateConfig(configWithArtifact);
  expect(resultWithArtifact).toEqual({
    storage: {
      type: "sqlite-artifact",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  });

  // Test sqlite-s3 storage
  const configWithS3: unknown = {
    storage: {
      type: "sqlite-s3",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  const resultWithS3 = validateConfig(configWithS3);
  expect(resultWithS3).toEqual({
    storage: {
      type: "sqlite-s3",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  });
});

test("configuration contract: invalid storage.type values", () => {
  // Test invalid storage type
  const configWithInvalidType: unknown = {
    storage: {
      type: "invalid-storage",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  expect(() => validateConfig(configWithInvalidType)).toThrow(/must be one of/);

  // Test storage object without type
  const configWithoutType: unknown = {
    storage: {},
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  expect(() => validateConfig(configWithoutType)).toThrow(/must be one of/);
});

test("configuration contract: storage type validation with other fields", () => {
  // Test storage with additional fields (should be rejected due to strict mode)
  const configWithExtraFields: unknown = {
    storage: {
      type: "sqlite-local",
      extraField: "should-not-be-allowed",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        command: "npm test",
      },
    },
  };

  expect(() => validateConfig(configWithExtraFields)).toThrow(/Unrecognized key/);
});

test("configuration contract: storage type with complex metrics", () => {
  const configWithComplexMetrics: unknown = {
    storage: {
      type: "sqlite-s3",
    },
    metrics: {
      "test-coverage": {
        type: "numeric",
        description: "Test coverage percentage",
        command: "npm run test:coverage",
        unit: "percent",
        timeout: 30000,
      },
      "build-status": {
        type: "label",
        description: "Build success/failure status",
        command: "echo 'success'",
      },
    },
  };

  const result = validateConfig(configWithComplexMetrics);
  expect(result.storage?.type).toBe("sqlite-s3");
  expect(Object.keys(result.metrics)).toHaveLength(2);
  expect(result.metrics["test-coverage"]?.unit).toBe("percent");
  expect(result.metrics["build-status"]?.type).toBe("label");
});
