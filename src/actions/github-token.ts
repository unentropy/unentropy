import * as core from "@actions/core";

export function resolveGitHubToken(): string | undefined {
  return core.getInput("github-token") || process.env.GITHUB_TOKEN || undefined;
}
