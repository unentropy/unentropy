import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { VerifyCommand } from "./cli/cmd/verify";
import { CollectCommand } from "./cli/cmd/collect";
import { TestCommand } from "./cli/cmd/test";

const cli = yargs()
  .scriptName("unentropy")
  .command(VerifyCommand)
  .command(CollectCommand)
  .command(TestCommand)
  .fail((msg) => {
    if (
      msg.startsWith("Unknown argument") ||
      msg.startsWith("Not enough non-option arguments") ||
      msg.startsWith("Invalid values:")
    ) {
      cli.showHelp("log");
    }
    process.exit(1);
  })
  .demandCommand()
  .strict()
  .help();

await cli.parse(hideBin(process.argv));
