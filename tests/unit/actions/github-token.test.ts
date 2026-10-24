import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as core from "@actions/core";
import { resolveGitHubToken } from "../../../src/actions/github-token";

vi.mock("@actions/core", () => ({
  getInput: vi.fn(),
}));

describe("resolveGitHubToken", () => {
  const originalToken = process.env.GITHUB_TOKEN;

  beforeEach(() => {
    delete process.env.GITHUB_TOKEN;
    vi.mocked(core.getInput).mockReset();
  });

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.GITHUB_TOKEN;
    } else {
      process.env.GITHUB_TOKEN = originalToken;
    }
  });

  it("returns the github-token input when set", () => {
    vi.mocked(core.getInput).mockReturnValue("input-token");
    process.env.GITHUB_TOKEN = "env-token";

    expect(resolveGitHubToken()).toBe("input-token");
    expect(core.getInput).toHaveBeenCalledWith("github-token");
  });

  it("falls back to GITHUB_TOKEN env when the input is empty", () => {
    vi.mocked(core.getInput).mockReturnValue("");
    process.env.GITHUB_TOKEN = "env-token";

    expect(resolveGitHubToken()).toBe("env-token");
  });

  it("returns undefined when both are empty", () => {
    vi.mocked(core.getInput).mockReturnValue("");
    process.env.GITHUB_TOKEN = "";

    expect(resolveGitHubToken()).toBeUndefined();
  });

  it("returns undefined when the env var is unset", () => {
    vi.mocked(core.getInput).mockReturnValue("");

    expect(resolveGitHubToken()).toBeUndefined();
  });
});
