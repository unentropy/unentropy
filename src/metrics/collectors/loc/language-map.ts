import sloc from "sloc";

/**
 * Set of extensions supported by the `sloc` library for fast lookup.
 */
export const SUPPORTED_EXTENSIONS = new Set(sloc.extensions as string[]);

/**
 * Returns true if the given file extension is natively supported by `sloc`.
 */
export function isExtensionSupported(ext: string): boolean {
  return SUPPORTED_EXTENSIONS.has(ext);
}

/**
 * Maps user-friendly language names to sloc file extensions.
 * Used by the `loc` collector to filter files by language.
 */
export const LANGUAGE_TO_EXTENSIONS: Record<string, string[]> = {
  TypeScript: ["ts", "tsx"],
  JavaScript: ["js", "jsx", "mjs"],
  Python: ["py"],
  Go: ["go"],
  Java: ["java"],
  PHP: ["php", "php5"],
  Ruby: ["rb"],
  Rust: ["rs"],
  C: ["c", "h"],
  "C++": ["cpp", "cc", "cxx", "hpp", "hxx"],
  "C#": ["cs"],
  CSS: ["css", "scss", "sass", "less", "styl"],
  HTML: ["html", "htm"],
  SQL: ["sql"],
  Vue: ["vue"],
  Kotlin: ["kt", "kts"],
  Swift: ["swift"],
  Scala: ["scala"],
  Dart: ["dart"],
  Erlang: ["erl"],
  Haskell: ["hs"],
  Lua: ["lua"],
  XML: ["xml"],
  YAML: ["yaml"],
  "F#": ["fs", "fsi", "fsx"],
  Groovy: ["groovy"],
  "Objective-C": ["m", "mm"],
  Perl: ["pl"],
  R: ["r"],
  Crystal: ["cr"],
  Nim: ["nim"],
  Nix: ["nix"],
  CoffeeScript: ["coffee", "iced"],
  Clojure: ["clj", "cljs"],
  Julia: ["jl"],
  Lisp: ["rkt"],
  JSON: ["json"],
  OCaml: ["ml", "mli"],
  "Visual Basic": ["vb"],
};

/**
 * Returns the set of sloc extensions for a given language name.
 * Throws if the language is not recognized.
 */
export function getExtensionsForLanguage(language: string): string[] {
  const extensions = LANGUAGE_TO_EXTENSIONS[language];
  if (!extensions) {
    const availableLanguages = Object.keys(LANGUAGE_TO_EXTENSIONS).join(", ");
    throw new Error(
      `Language "${language}" not supported. Available languages: ${availableLanguages}`
    );
  }
  return extensions;
}
