import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";

registerHooks({
  load(url, context, nextLoad) {
    if (context.importAttributes?.type === "text") {
      const source = `export default ${JSON.stringify(readFileSync(new URL(url), "utf8"))};`;
      return { format: "module", source, shortCircuit: true };
    }
    return nextLoad(url, context);
  },
});
