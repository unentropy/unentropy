import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { VerifyCommand } from "./cli/cmd/verify";
import { CollectCommand } from "./cli/cmd/collect";
import { TestCommand } from "./cli/cmd/test";
import { InitCommand } from "./cli/cmd/init";
import { PreviewCommand } from "./cli/cmd/preview";

const cli = yargs()
  .scriptName("unentropy")
  .command(VerifyCommand)
  .command(CollectCommand)
  .command(TestCommand)
  .command(InitCommand)
  .command(PreviewCommand)
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
