import { describe, test, expect } from "bun:test";
import render from "preact-render-to-string";
import { h } from "preact";
import { Section } from "../../../src/reporter/templates/default/components/Section";
import { MultiMetricChartCard } from "../../../src/reporter/templates/default/components/MultiMetricChartCard";
import type { SectionData, MetricReportData } from "../../../src/reporter/types";

const createMetric = (
  id: string,
  name: string,
  chartType: "line" | "bar" = "line"
): MetricReportData => ({
  id,
  name,
  description: null,
  unit: null,
  stats: {
    latest: null,
    min: null,
    max: null,
    average: null,
    trendDirection: null,
    trendPercent: null,
  },
  chartType,
  dataPointCount: 0,
});

describe("Section", () => {
  test("renders section name and description", () => {
    const section: SectionData = {
      name: "Code Size",
      description: "Source code metrics by language",
      charts: [{ type: "single", metricId: "loc", title: "Lines of Code", chartType: "line" }],
    };

    const metrics = [createMetric("loc", "Lines of Code")];
    const html = render(h(Section, { section, metrics }));

    expect(html).toContain("Code Size");
    expect(html).toContain("Source code metrics by language");
  });

  test("renders single-metric chart cards", () => {
    const section: SectionData = {
      name: "Build",
      charts: [
        { type: "single", metricId: "bundle-size", title: "Bundle Size", chartType: "line" },
      ],
    };

    const metrics = [createMetric("bundle-size", "Bundle Size")];
    const html = render(h(Section, { section, metrics }));

    expect(html).toContain("Bundle Size");
    expect(html).toContain("metric-card");
  });

  test("renders multi-metric chart cards", () => {
    const section: SectionData = {
      name: "Refactoring",
      charts: [
        {
          type: "multi",
          metricIds: ["modern", "legacy"],
          title: "Modern vs Legacy",
          chartType: "line",
        },
      ],
    };

    const metrics = [createMetric("modern", "Modern"), createMetric("legacy", "Legacy")];
    const html = render(h(Section, { section, metrics }));

    expect(html).toContain("Modern vs Legacy");
    expect(html).toContain("multi-metric");
  });

  test("skips invalid metric references", () => {
    const section: SectionData = {
      name: "Section",
      charts: [{ type: "single", metricId: "missing", title: "Missing", chartType: "line" }],
    };

    const metrics = [createMetric("other", "Other")];
    const html = render(h(Section, { section, metrics }));

    // Should not crash, just render empty grid
    expect(html).toContain("Section");
  });
});

describe("MultiMetricChartCard", () => {
  test("renders custom title", () => {
    const metrics = [createMetric("a", "Metric A"), createMetric("b", "Metric B")];
    const html = render(h(MultiMetricChartCard, { title: "Custom Title", metrics }));

    expect(html).toContain("Custom Title");
  });

  test("renders stat grids for each metric", () => {
    const metrics = [createMetric("a", "Metric A"), createMetric("b", "Metric B")];
    const html = render(h(MultiMetricChartCard, { title: "Title", metrics }));

    expect(html).toContain("Metric A");
    expect(html).toContain("Metric B");
  });

  test("renders chart canvas with combined id", () => {
    const metrics = [createMetric("modern", "Modern"), createMetric("legacy", "Legacy")];
    const html = render(h(MultiMetricChartCard, { title: "Comparison", metrics }));

    expect(html).toContain('id="chart-modern-legacy"');
  });
});
