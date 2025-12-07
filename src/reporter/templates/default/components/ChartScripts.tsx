import type { ChartsData } from "../../../types";
import serialize from "serialize-javascript";
import chartInitScript from "../scripts/charts.js" with { type: "text" };

interface ChartScriptsProps {
  chartsData: ChartsData;
}

export function ChartScripts({ chartsData }: ChartScriptsProps) {
  const dataScript = `
    var __chartData = {
      timeline: ${serialize(chartsData.timeline)},
      metadata: ${serialize(chartsData.metadata)},
      lineCharts: ${serialize(chartsData.lineCharts)},
      barCharts: ${serialize(chartsData.barCharts)},
      previewLineCharts: ${serialize(chartsData.previewLineCharts)},
      previewBarCharts: ${serialize(chartsData.previewBarCharts)},
      showToggle: ${chartsData.showToggle},
      previewData: ${serialize(chartsData.previewData)}
    };
    initializeCharts(
      __chartData.timeline, 
      __chartData.metadata, 
      __chartData.lineCharts, 
      __chartData.barCharts,
      __chartData.previewLineCharts,
      __chartData.previewBarCharts,
      __chartData.showToggle, 
      __chartData.previewData
    );
  `;

  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: chartInitScript }} />
      <script dangerouslySetInnerHTML={{ __html: dataScript }} />
    </>
  );
}
