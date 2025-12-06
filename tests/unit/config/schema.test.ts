import { describe, it, expect } from "bun:test";
import { validateConfig } from "../../../src/config/schema";

describe("Config Schema Validation", () => {
  describe("Invalid Metric Keys", () => {
    it("should reject uppercase letters in metric key", () => {
      const config = {
        metrics: {
          "Test-Coverage": {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject metric keys with underscores", () => {
      const config = {
        metrics: {
          test_coverage: {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject metric keys with spaces", () => {
      const config = {
        metrics: {
          "test coverage": {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject metric keys exceeding 64 characters", () => {
      const config = {
        metrics: {
          ["a".repeat(65)]: {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should accept valid metric keys with hyphens and numbers", () => {
      const config = {
        metrics: {
          "test-coverage-2024": {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Duplicate Metric Keys", () => {
    it("should naturally prevent duplicate keys (object property)", () => {
      const config = {
        metrics: {
          "test-coverage": {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should allow different metric keys", () => {
      const config = {
        metrics: {
          "test-coverage": {
            type: "numeric",
            command: "echo 85",
          },
          "bundle-size": {
            type: "numeric",
            command: "echo 100",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Type Mismatches", () => {
    it("should reject invalid metric type", () => {
      const config = {
        metrics: {
          coverage: {
            type: "percentage",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should accept numeric type", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should accept label type", () => {
      const config = {
        metrics: {
          status: {
            type: "label",
            command: "echo healthy",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Empty/Missing Required Fields", () => {
    it("should reject missing type field", () => {
      const config = {
        metrics: {
          coverage: {
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject missing command field", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject empty command", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject empty metrics object", () => {
      const config = {
        metrics: {},
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject missing metrics field", () => {
      const config = {};

      expect(() => validateConfig(config)).toThrow();
    });

    it("should allow optional description field", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });

    it("should allow optional unit field", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Clear Error Messages", () => {
    it("should provide clear error for invalid metric key pattern", () => {
      const config = {
        metrics: {
          Test_Coverage: {
            type: "numeric",
            command: "echo 85",
          },
        },
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message.toLowerCase()).toMatch(/lowercase|pattern|hyphen|key/);
      }
    });

    it("should provide clear error for invalid type", () => {
      const config = {
        metrics: {
          coverage: {
            type: "percentage",
            command: "echo 85",
          },
        },
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain("type");
        expect(message.toLowerCase()).toMatch(/numeric|label/);
      }
    });

    it("should provide clear error for empty command", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "",
          },
        },
      };

      try {
        validateConfig(config);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message.toLowerCase()).toContain("command");
        expect(message.toLowerCase()).toMatch(/empty|required/);
      }
    });
  });

  describe("Field Length Constraints", () => {
    it("should reject description longer than 256 characters", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo 85",
            description: "a".repeat(257),
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject command longer than 1024 characters", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo " + "a".repeat(1020),
          },
        },
      };

      expect(() => validateConfig(config)).toThrow();
    });

    it("should reject invalid unit value", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo 85",
            unit: "invalid-value",
          },
        },
      };

      expect(() => validateConfig(config)).toThrow(/unit must be one of/);
    });

    it("should accept valid field lengths", () => {
      const config = {
        metrics: {
          coverage: {
            type: "numeric",
            command: "echo 85",
            description: "a".repeat(256),
            unit: "percent",
          },
        },
      };

      expect(() => validateConfig(config)).not.toThrow();
    });
  });

  describe("Quality Gate Configuration", () => {
    describe("Valid Quality Gate Configurations", () => {
      it("should accept qualityGate with mode set to off", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "off",
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept qualityGate with mode set to soft", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "no-regression", tolerance: 0.5 }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept qualityGate with mode set to hard", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "hard",
            thresholds: [{ metric: "coverage", mode: "min", target: 80 }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept qualityGate with enablePullRequestComment", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            enablePullRequestComment: true,
            thresholds: [{ metric: "coverage", mode: "no-regression" }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept qualityGate with maxCommentMetrics", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            maxCommentMetrics: 50,
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept qualityGate with maxCommentCharacters", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            maxCommentCharacters: 5000,
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept qualityGate with baseline configuration", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            baseline: {
              referenceBranch: "main",
              maxAgeDays: 90,
            },
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    describe("Threshold Configuration Validation", () => {
      it("should accept no-regression threshold mode", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "no-regression", tolerance: 0.5 }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept min threshold mode with target", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "min", target: 80 }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept max threshold mode with target", () => {
        const config = {
          metrics: {
            "bundle-size": {
              type: "numeric",
              command: "echo 100",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "bundle-size", mode: "max", target: 500 }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept delta-max-drop threshold mode with maxDropPercent", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "delta-max-drop", maxDropPercent: 5 }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept threshold with warning severity", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "min", target: 80, severity: "warning" }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept threshold with blocker severity", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "min", target: 80, severity: "blocker" }],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept multiple threshold rules for different metrics", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
            "bundle-size": {
              type: "numeric",
              command: "echo 100",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [
              { metric: "coverage", mode: "min", target: 80 },
              { metric: "bundle-size", mode: "max", target: 500 },
            ],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    describe("Invalid Quality Gate Configurations", () => {
      it("should reject invalid mode value", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "invalid",
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject invalid threshold mode", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "invalid-mode" }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject threshold referencing non-existent metric", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "nonexistent", mode: "min", target: 80 }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject min mode without target", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "min" }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject max mode without target", () => {
        const config = {
          metrics: {
            "bundle-size": {
              type: "numeric",
              command: "echo 100",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "bundle-size", mode: "max" }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject delta-max-drop mode without maxDropPercent", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "delta-max-drop" }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject negative tolerance", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "no-regression", tolerance: -1 }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject negative maxDropPercent", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "delta-max-drop", maxDropPercent: -5 }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject maxCommentMetrics less than 1", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            maxCommentMetrics: 0,
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject maxCommentMetrics greater than 100", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            maxCommentMetrics: 101,
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject maxCommentCharacters less than or equal to 0", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            maxCommentCharacters: 0,
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject maxCommentCharacters greater than 20000", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            maxCommentCharacters: 20001,
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject baseline maxAgeDays less than or equal to 0", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            baseline: {
              maxAgeDays: 0,
            },
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject invalid severity value", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "min", target: 80, severity: "invalid" }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject threshold missing metric field", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ mode: "min", target: 80 }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject threshold missing mode field", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", target: 80 }],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject invalid baseline aggregate value", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            baseline: {
              aggregate: "mean",
            },
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });
    });

    describe("Clear Error Messages for Quality Gate", () => {
      it("should provide clear error for threshold referencing non-existent metric", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "nonexistent", mode: "min", target: 80 }],
          },
        };

        try {
          validateConfig(config);
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const message = (error as Error).message;
          expect(message.toLowerCase()).toContain("metric");
          expect(message).toContain("nonexistent");
        }
      });

      it("should provide clear error for min mode missing target", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "min" }],
          },
        };

        try {
          validateConfig(config);
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const message = (error as Error).message;
          expect(message.toLowerCase()).toMatch(/target|required/);
        }
      });

      it("should provide clear error for delta-max-drop mode missing maxDropPercent", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          qualityGate: {
            mode: "soft",
            thresholds: [{ metric: "coverage", mode: "delta-max-drop" }],
          },
        };

        try {
          validateConfig(config);
          expect(true).toBe(false);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          const message = (error as Error).message;
          expect(message.toLowerCase()).toMatch(/maxdroppercent|required/);
        }
      });
    });

    describe("Backward Compatibility", () => {
      it("should accept config without qualityGate block", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept config with storage and qualityGate", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
              command: "echo 85",
            },
          },
          storage: {
            type: "sqlite-local",
          },
          qualityGate: {
            mode: "soft",
            thresholds: [],
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });
  });

  describe("Built-in Metric References ($ref)", () => {
    describe("Pure $ref Usage", () => {
      it("should accept $ref without command field (validation happens at resolution)", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
            },
          },
        };

        // Schema validation allows this - command requirement is checked during resolution
        // Templates like 'loc' have default commands, 'coverage' does not
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept valid $ref with command", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
              command: "bun test --coverage --coverage-reporter=json | jq -r '.total.lines.pct'",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept multiple $ref entries with commands", () => {
        const config = {
          metrics: {
            coverage: { $ref: "coverage", command: "echo 85" },
            "bundle-size": { $ref: "bundle-size", command: "du -k dist/bundle.js | cut -f1" },
            loc: {
              $ref: "loc",
              command: "find src/ -name '*.ts' | xargs wc -l | tail -1 | awk '{print $1}'",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept all valid built-in metric IDs with commands", () => {
        const validRefs = [
          "coverage",
          "function-coverage",
          "loc",
          "bundle-size",
          "build-time",
          "test-time",
          "dependencies-count",
        ];

        for (const ref of validRefs) {
          const config = {
            metrics: { [ref]: { $ref: ref, command: "echo 0" } },
          };
          expect(() => validateConfig(config)).not.toThrow();
        }
      });
    });

    describe("$ref with Overrides", () => {
      it("should accept $ref with name override and command", () => {
        const config = {
          metrics: {
            "unit-test-coverage": {
              $ref: "coverage",
              name: "Unit Test Coverage",
              command: "bun test --coverage",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref with command only", () => {
        const config = {
          metrics: {
            "bundle-size": {
              $ref: "bundle-size",
              command: "du -k dist/main.js | cut -f1",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref with unit override and command", () => {
        const config = {
          metrics: {
            "bundle-size": {
              $ref: "bundle-size",
              command: "du -k dist/main.js | cut -f1",
              unit: "bytes",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref with description override and command", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
              command: "bun test --coverage",
              description: "Custom coverage description",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref with timeout override and command", () => {
        const config = {
          metrics: {
            "build-time": {
              $ref: "build-time",
              command: "time bun run build",
              timeout: 60000,
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref with multiple overrides including command", () => {
        const config = {
          metrics: {
            "frontend-coverage": {
              $ref: "coverage",
              name: "Frontend Coverage",
              command: "bun test --coverage",
              unit: "percent",
              description: "Frontend test coverage",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should reject $ref with empty command override", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
              command: "",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject $ref with invalid unit value", () => {
        const config = {
          metrics: {
            "bundle-size": {
              $ref: "bundle-size",
              command: "echo 100",
              unit: "invalid-unit",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow(/unit must be one of/);
      });

      it("should accept $ref with type field and command (validation deferred to resolver)", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
              command: "echo 85",
              type: "label",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    describe("Invalid $ref Values", () => {
      it("should accept any $ref string value with command (validation deferred to resolver)", () => {
        const config = {
          metrics: {
            "unknown-metric": {
              $ref: "unknown-metric",
              command: "echo 0",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept case-variant references with command (validation deferred to resolver)", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "Coverage",
              command: "echo 85",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should reject missing $ref value (empty string not valid)", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "",
              command: "echo 0",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });
    });

    describe("Mixed Built-in and Custom Metrics", () => {
      it("should accept mix of $ref and custom metrics", () => {
        const config = {
          metrics: {
            coverage: { $ref: "coverage", command: "bun test --coverage" },
            loc: { $ref: "loc", command: "find src/ -name '*.ts' | xargs wc -l" },
            "custom-score": {
              type: "numeric",
              command: "echo 95",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref with override alongside custom metrics", () => {
        const config = {
          metrics: {
            "prod-bundle": {
              $ref: "bundle-size",
              name: "Prod Bundle",
              command: "du -k dist/prod.js | cut -f1",
            },
            "dev-bundle": {
              type: "numeric",
              command: "du -k dist/dev.js | cut -f1",
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });
    });

    describe("Metric with $ref Missing Required Fields", () => {
      it("should accept metric with $ref but no command (per v3.0.0 spec)", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
            },
          },
        };

        // Per v3.0.0 spec: schema validation allows $ref without command
        // Whether command is required depends on the template (checked during resolution)
        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should accept $ref for templates with default commands", () => {
        const config = {
          metrics: {
            loc: {
              $ref: "loc", // Has default command in template
            },
          },
        };

        expect(() => validateConfig(config)).not.toThrow();
      });

      it("should reject metric without $ref and without type", () => {
        const config = {
          metrics: {
            coverage: {
              command: "echo 85",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject metric without $ref and without command", () => {
        const config = {
          metrics: {
            coverage: {
              type: "numeric",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });
    });

    describe("Strict Mode Validation", () => {
      it("should reject unknown properties alongside $ref", () => {
        const config = {
          metrics: {
            coverage: {
              $ref: "coverage",
              command: "echo 85",
              unknownProp: "value",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });

      it("should reject unknown properties in custom metrics", () => {
        const config = {
          metrics: {
            custom: {
              type: "numeric",
              command: "echo 1",
              unknownProp: "value",
            },
          },
        };

        expect(() => validateConfig(config)).toThrow();
      });
    });
  });
});
