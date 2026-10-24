import { describe, it, expect } from "vitest";
import {
  formatValue,
  formatDelta,
  formatInteger,
  formatBytes,
  formatDuration,
} from "../../../src/metrics/unit-formatter.js";

describe("formatValue", () => {
  describe("percent formatting", () => {
    it("formats percent with 1 decimal place and % suffix", () => {
      expect(formatValue(85.5, "percent")).toBe("85.5%");
    });

    it("formats 100 percent correctly", () => {
      expect(formatValue(100, "percent")).toBe("100.0%");
    });

    it("formats 0 percent correctly", () => {
      expect(formatValue(0, "percent")).toBe("0.0%");
    });
  });

  describe("integer formatting", () => {
    it("formats integer without decimals", () => {
      expect(formatValue(1234, "integer")).toBe("1,234");
    });

    it("formats large integers with thousands separator", () => {
      expect(formatValue(1234567, "integer")).toBe("1,234,567");
    });

    it("formats zero correctly", () => {
      expect(formatValue(0, "integer")).toBe("0");
    });
  });

  describe("bytes formatting", () => {
    it("formats bytes without suffix for values < 1KB", () => {
      expect(formatValue(500, "bytes")).toBe("500 B");
    });

    it("formats kilobytes with 1 decimal place", () => {
      expect(formatValue(1536, "bytes")).toBe("1.5 KB");
    });

    it("formats megabytes with 1 decimal place", () => {
      expect(formatValue(1572864, "bytes")).toBe("1.5 MB");
    });

    it("formats gigabytes with 1 decimal place", () => {
      expect(formatValue(1610612736, "bytes")).toBe("1.5 GB");
    });
  });

  describe("duration formatting", () => {
    it("formats sub-second durations as milliseconds", () => {
      expect(formatValue(0.5, "duration")).toBe("500ms");
    });

    it("formats seconds without minutes", () => {
      expect(formatValue(45, "duration")).toBe("45s");
    });

    it("formats minutes and seconds", () => {
      expect(formatValue(90, "duration")).toBe("1m 30s");
    });

    it("formats hours and minutes", () => {
      expect(formatValue(3665, "duration")).toBe("1h 1m");
    });
  });

  describe("null handling", () => {
    it("returns N/A for null value with percent unit", () => {
      expect(formatValue(null, "percent")).toBe("N/A");
    });

    it("returns N/A for null value with null unit", () => {
      expect(formatValue(null, null)).toBe("N/A");
    });

    it("returns N/A for null value with integer unit", () => {
      expect(formatValue(null, "integer")).toBe("N/A");
    });

    it("returns N/A for null value with bytes unit", () => {
      expect(formatValue(null, "bytes")).toBe("N/A");
    });

    it("returns N/A for null value with duration unit", () => {
      expect(formatValue(null, "duration")).toBe("N/A");
    });

    it("returns N/A for null value with decimal unit", () => {
      expect(formatValue(null, "decimal")).toBe("N/A");
    });
  });

  describe("decimal formatting", () => {
    it("formats decimal with 2 decimal places", () => {
      expect(formatValue(3.14159, "decimal")).toBe("3.14");
    });

    it("formats decimal with 0 decimal input", () => {
      expect(formatValue(5, "decimal")).toBe("5.00");
    });

    it("formats decimal with 1 decimal place", () => {
      expect(formatValue(2.1, "decimal")).toBe("2.10");
    });
  });
});

describe("formatInteger", () => {
  it("formats single digit integer", () => {
    expect(formatInteger(1)).toBe("1");
  });

  it("formats three digit integer with thousands separator", () => {
    expect(formatInteger(1234)).toBe("1,234");
  });

  it("formats seven digit integer with multiple separators", () => {
    expect(formatInteger(1234567)).toBe("1,234,567");
  });

  it("rounds decimal values to nearest integer", () => {
    expect(formatInteger(1234.5)).toBe("1,235");
  });

  it("formats zero correctly", () => {
    expect(formatInteger(0)).toBe("0");
  });

  it("formats negative integers", () => {
    expect(formatInteger(-1234)).toBe("-1,234");
  });
});

describe("formatBytes", () => {
  it("formats bytes for small values", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes with 1 decimal", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats kilobytes edge case", () => {
    expect(formatBytes(1024)).toBe("1 KB");
  });

  it("formats megabytes with 1 decimal", () => {
    expect(formatBytes(1572864)).toBe("1.5 MB");
  });

  it("formats megabytes edge case", () => {
    expect(formatBytes(1048576)).toBe("1 MB");
  });

  it("formats gigabytes with 1 decimal", () => {
    expect(formatBytes(1610612736)).toBe("1.5 GB");
  });

  it("formats gigabytes edge case", () => {
    expect(formatBytes(1073741824)).toBe("1 GB");
  });

  it("handles negative byte values", () => {
    expect(formatBytes(-1536)).toBe("-1.5 KB");
  });

  it("handles zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("formatDuration", () => {
  it("formats sub-second durations as milliseconds", () => {
    expect(formatDuration(0.5)).toBe("500ms");
  });

  it("formats milliseconds rounding correctly", () => {
    expect(formatDuration(0.1)).toBe("100ms");
  });

  it("formats exactly 1 second", () => {
    expect(formatDuration(1)).toBe("1s");
  });

  it("formats seconds without minutes", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats 59 seconds without minutes", () => {
    expect(formatDuration(59)).toBe("59s");
  });

  it("formats exactly 1 minute", () => {
    expect(formatDuration(60)).toBe("1m 0s");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });

  it("formats 1 hour edge case", () => {
    expect(formatDuration(3600)).toBe("1h 0m");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3665)).toBe("1h 1m");
  });

  it("formats large durations in hours", () => {
    expect(formatDuration(7322)).toBe("2h 2m");
  });

  it("formats zero duration", () => {
    expect(formatDuration(0)).toBe("0ms");
  });
});

describe("formatDelta", () => {
  it("formats positive percent delta with plus sign", () => {
    expect(formatDelta(2.5, "percent")).toBe("+2.5%");
  });

  it("formats negative percent delta with minus sign", () => {
    expect(formatDelta(-2.5, "percent")).toBe("-2.5%");
  });

  it("formats positive integer delta with plus sign", () => {
    expect(formatDelta(150, "integer")).toBe("+150");
  });

  it("formats negative integer delta with minus sign", () => {
    expect(formatDelta(-150, "integer")).toBe("-150");
  });

  it("formats positive bytes delta with plus sign", () => {
    expect(formatDelta(262144, "bytes")).toBe("+256 KB");
  });

  it("formats negative bytes delta with minus sign", () => {
    expect(formatDelta(-262144, "bytes")).toBe("-256 KB");
  });

  it("formats positive duration delta with plus sign", () => {
    expect(formatDelta(90, "duration")).toBe("+1m 30s");
  });

  it("formats negative duration delta with minus sign", () => {
    expect(formatDelta(-90, "duration")).toBe("-1m 30s");
  });

  it("formats zero delta with plus sign", () => {
    expect(formatDelta(0, "percent")).toBe("+0.0%");
  });

  it("formats delta with null unit", () => {
    expect(formatDelta(5, null)).toBe("+N/A");
  });
});
