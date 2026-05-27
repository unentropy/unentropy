declare module "micromatch" {
  export function match(list: string[], patterns: string[]): string[];
  export function isMatch(input: string, patterns: string[]): boolean;
}
