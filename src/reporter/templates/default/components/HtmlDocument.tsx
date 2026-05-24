import type { ReportData, ChartsData } from "../../../types";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { MetricCard } from "./MetricCard";
import { EmptyState } from "./EmptyState";
import { ChartScripts } from "./ChartScripts";
import { PreviewBar } from "./PreviewBar";
import { Section } from "./Section";
import type { ResolvedTheme } from "../themes";
import { buildStyleSheet, type ThemeMode } from "../styles";
import themeToggleScript from "../scripts/theme-toggle.js" with { type: "text" };

interface HtmlDocumentProps {
  data: ReportData;
  chartsData: ChartsData;
  theme: ResolvedTheme;
  mode: ThemeMode;
}

export function HtmlDocument({ data, chartsData, theme, mode }: HtmlDocumentProps) {
  const hasLayout = chartsData.layout && chartsData.layout.sections.length > 0;
  const css = buildStyleSheet(theme);
  const htmlAttrs: { lang: string; "data-theme"?: string } = { lang: "en" };
  if (mode === "light" || mode === "dark") {
    htmlAttrs["data-theme"] = mode;
  }

  return (
    <html {...htmlAttrs}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Unentropy Metrics Report - {data.metadata.repository}</title>

        <script dangerouslySetInnerHTML={{ __html: themeToggleScript }} />
        <script src="https://cdn.tailwindcss.com"></script>
        <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>

        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <Header metadata={data.metadata} buildCount={data.metadata.buildCount} />
        <PreviewBar visible={chartsData.showToggle} />

        <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {hasLayout && chartsData.layout ? (
            chartsData.layout.sections.map((section) => (
              <Section
                key={section.name}
                section={section}
                metrics={data.metrics}
                previewMetrics={data.previewMetrics}
                showToggle={chartsData.showToggle}
              />
            ))
          ) : (
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
          )}
        </main>

        <Footer metadata={data.metadata} />

        <ChartScripts chartsData={chartsData} />
      </body>
    </html>
  );
}
