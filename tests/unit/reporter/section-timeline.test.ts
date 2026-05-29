import { describe, test, expect } from "bun:test";
import chartsScript from "../../../src/reporter/templates/default/scripts/charts.js" with { type: "text" };

interface MetadataPoint {
  sha: string;
  run: number;
}
interface LineChart {
  id: string;
  name: string;
  unit: string | null;
  values: (number | null)[];
}
interface ChartConfig {
  type: "single" | "multi";
  metricId?: string;
  metricIds?: string[];
}
interface Section {
  name: string;
  charts: ChartConfig[];
}
interface SectionView {
  indices: number[];
  timeline: string[];
  metadata: (MetadataPoint | null)[];
}

// charts.js is an inlined browser script with no module exports. Its
// section-timeline helpers are pure (no DOM access at definition time), so we
// evaluate the script text and pull the helpers out for direct unit testing.
const helpers = new Function(
  chartsScript +
    "\nreturn { computeSectionIndices, buildSectionView, sliceValues, sectionRangeFromView };"
)() as {
  computeSectionIndices: (
    section: Section,
    lineCharts: LineChart[],
    timeline: string[]
  ) => number[];
  buildSectionView: (
    section: Section,
    lineCharts: LineChart[],
    timeline: string[],
    metadata: (MetadataPoint | null)[]
  ) => SectionView;
  sliceValues: (values: (number | null)[], view: SectionView) => (number | null)[];
  sectionRangeFromView: (view: SectionView) => { min: string; max: string } | null;
};

const timeline = ["2025-01-01", "2025-01-02", "2025-01-03", "2025-01-04", "2025-01-05"];
const metadata = timeline.map((_, i) => ({ sha: "sha" + i, run: i + 1 }));

// Section A metrics — data on builds 0, 2, 4
const a1: LineChart = { id: "a1", name: "A1", unit: null, values: [10, null, 12, null, 14] };
const a2: LineChart = { id: "a2", name: "A2", unit: null, values: [20, null, null, null, 24] };
// Section B metric — data on builds 1, 3
const b1: LineChart = { id: "b1", name: "B1", unit: null, values: [null, 30, null, 33, null] };
const lineCharts: LineChart[] = [a1, a2, b1];

const sectionA: Section = { name: "A", charts: [{ type: "multi", metricIds: ["a1", "a2"] }] };
const sectionB: Section = { name: "B", charts: [{ type: "single", metricId: "b1" }] };

describe("computeSectionIndices", () => {
  test("returns the union of indices where any section metric has data", () => {
    expect(helpers.computeSectionIndices(sectionA, lineCharts, timeline)).toEqual([0, 2, 4]);
    expect(helpers.computeSectionIndices(sectionB, lineCharts, timeline)).toEqual([1, 3]);
  });

  test("is ascending and excludes builds unique to other sections", () => {
    const a = helpers.computeSectionIndices(sectionA, lineCharts, timeline);
    expect(a).not.toContain(1); // build only in section B
    expect(a).not.toContain(3);
    expect([...a].sort((x, y) => x - y)).toEqual(a);
  });

  test("returns empty when a section has no data anywhere", () => {
    const empty: Section = { name: "Empty", charts: [{ type: "single", metricId: "missing" }] };
    expect(helpers.computeSectionIndices(empty, lineCharts, timeline)).toEqual([]);
  });
});

describe("buildSectionView", () => {
  test("slices timeline and metadata to the section indices", () => {
    const view = helpers.buildSectionView(sectionA, lineCharts, timeline, metadata);
    expect(view.indices).toEqual([0, 2, 4]);
    expect(view.timeline).toEqual(["2025-01-01", "2025-01-03", "2025-01-05"]);
    expect(view.metadata.map((m) => m && m.run)).toEqual([1, 3, 5]);
  });
});

describe("sliceValues", () => {
  test("aligns a chart's values to the section view indices", () => {
    const view = helpers.buildSectionView(sectionA, lineCharts, timeline, metadata);
    // a1 had data on every section build → fully continuous within the section
    expect(helpers.sliceValues(a1.values, view)).toEqual([10, 12, 14]);
  });

  test("preserves genuine intra-section gaps (US2)", () => {
    // a2 only has data on builds 0 and 4; build 2 is in scope because peer a1
    // has data there, so a2 keeps a null gap at the section index for build 2.
    const view = helpers.buildSectionView(sectionA, lineCharts, timeline, metadata);
    expect(helpers.sliceValues(a2.values, view)).toEqual([20, null, 24]);
  });
});

describe("section continuity with disjoint build sets (US1)", () => {
  test("neither section retains a gap caused solely by the other section's builds", () => {
    const viewA = helpers.buildSectionView(sectionA, lineCharts, timeline, metadata);
    const viewB = helpers.buildSectionView(sectionB, lineCharts, timeline, metadata);

    // Section A's a1 line is continuous (no nulls) across A's timeline.
    expect(helpers.sliceValues(a1.values, viewA)).not.toContain(null);
    // Section B's b1 line is continuous across B's timeline.
    expect(helpers.sliceValues(b1.values, viewB)).toEqual([30, 33]);
    expect(helpers.sliceValues(b1.values, viewB)).not.toContain(null);
  });
});

describe("sectionRangeFromView", () => {
  test("uses the section timeline endpoints", () => {
    const view = helpers.buildSectionView(sectionA, lineCharts, timeline, metadata);
    expect(helpers.sectionRangeFromView(view)).toEqual({ min: "2025-01-01", max: "2025-01-05" });
  });

  test("returns null for an empty section", () => {
    const empty: Section = { name: "Empty", charts: [{ type: "single", metricId: "missing" }] };
    const view = helpers.buildSectionView(empty, lineCharts, timeline, metadata);
    expect(helpers.sectionRangeFromView(view)).toBeNull();
  });
});
