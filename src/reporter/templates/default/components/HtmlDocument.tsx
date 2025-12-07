import type { ReportData, ChartsData } from "../../../types";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MetricCard } from "./MetricCard";
import { EmptyState } from "./EmptyState";
import { ChartScripts } from "./ChartScripts";
import { PrintStyles } from "./PrintStyles";
import { PreviewBar } from "./PreviewBar";

interface HtmlDocumentProps {
  data: ReportData;
  chartsData: ChartsData;
}

export function HtmlDocument({ data, chartsData }: HtmlDocumentProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unentropy Metrics Report - {data.metadata.repository}</title>

        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

        <PrintStyles />
      </head>
      <body class="bg-gray-50 dark:bg-gray-900">
        <Header metadata={data.metadata} />
        <PreviewBar visible={chartsData.showToggle} />

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.metrics.length > 0 ? (
              chartsData.showToggle ? (
                <>
                  {data.metrics.map((metric) => (
                    <div key={metric.id} data-view="real" class="hidden" aria-hidden="true">
                      <MetricCard metric={metric} />
                    </div>
                  ))}
                  {data.previewMetrics?.map((metric) => (
                    <div key={metric.id} data-view="preview">
                      <MetricCard metric={metric} />
                    </div>
                  ))}
                </>
              ) : (
                data.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)
              )
            ) : (
              <EmptyState />
            )}
          </div>
        </main>

        <Footer />

        <ChartScripts chartsData={chartsData} />
      </body>
    </html>
  );
}
