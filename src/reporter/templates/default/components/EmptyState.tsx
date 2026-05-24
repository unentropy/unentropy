export function EmptyState() {
  return (
    <div class="text-center py-12">
      <pre class="uent-empty-flourish uent-mono text-sm leading-tight mx-auto inline-block">
        {`▄▄ ▄▄ ▄▄  ▄▄ ▄▄▄▄▄ ▄▄  ▄▄ ▄▄▄▄ ▄▄▄▄   ▄▄▄  ▄▄▄▄  ▄▄ ▄▄
██ ██ ███▄██ ██▄▄  ███▄██  ██  ██▄█▄ ██▀██ ██▄█▀ ▀███▀
▀███▀ ██ ▀██ ██▄▄▄ ██ ▀██  ██  ██ ██ ▀███▀ ██      █`}
      </pre>
      <h3 class="mt-6 text-sm font-medium" style="color: var(--text)">
        No metrics data
      </h3>
      <p class="mt-1 text-sm" style="color: var(--text-muted)">
        No metrics have been collected yet. Run your CI pipeline to start collecting data.
      </p>
    </div>
  );
}
