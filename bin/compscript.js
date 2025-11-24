#!/usr/bin/env node

const dotenv = require("dotenv");
const fs = require("fs");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");

// Load environment
const env = process.env.ENV || "DEV";
dotenv.config({ path: ".env." + env });

const auth = require("../auth");
const { executeScript, formatOutputForTerminal } = require("../script-runner");

const argv = yargs(hideBin(process.argv))
  .usage("Usage: $0 <wcaId> [options] <file>")
  .command("$0 <wcaId> [file]", "Run a compscript", (yargs) => {
    yargs
      .positional("wcaId", {
        describe: "WCA Competition ID",
        type: "string",
      })
      .positional("file", {
        describe: "Compscript file to execute",
        type: "string",
      });
  })
  .option("script", {
    alias: "s",
    type: "string",
    description: "Script to execute inline",
  })
  .option("dry-run", {
    alias: "d",
    type: "boolean",
    default: true,
    description: "Run in dry-run mode (no mutations)",
  })
  .option("clear-cache", {
    alias: "c",
    type: "boolean",
    default: false,
    description: "Clear competition cache before running",
  })
  .example("$0 CubingUSANationals2024 script.cs", "Run script.cs for Nationals")
  .example(
    '$0 CubingUSANationals2024 -s "Print(\\"Hello\\")"',
    "Run inline script"
  )
  .help()
  .alias("help", "h").argv;

async function main() {
  const { wcaId, file, script, dryRun, clearCache } = argv

  try {
    // Fetch competition WCIF
    console.log(`Fetching competition data for ${wcaId}...`)
    const competition = await auth.getWcifForCLI(wcaId)

    // Determine script to run
    let scriptContent = script || "";
    if (file) {
      if (!fs.existsSync(file)) {
        console.error(`Error: File not found: ${file}`);
        process.exit(1);
      }
      scriptContent = fs.readFileSync(file, "utf8");
    }

    if (!scriptContent) {
      console.error(
        "Error: No script provided. Use --script or provide a file."
      );
      process.exit(1);
    }

    // Clear cache if requested
    if (clearCache) {
      const cachePath = auth.cachePath(wcaId);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log("Cache cleared.");
      }
    }

    // Execute script
    console.log(`Executing script${dryRun ? " (dry-run)" : ""}...\n`);
    const result = await executeScript(
      competition,
      scriptContent,
      null,
      dryRun,
      clearCache
    );

    // Display outputs
    if (result.outputs && result.outputs.length > 0) {
      result.outputs.forEach((output) => {
        console.log(formatOutputForTerminal(output));
      });
    }

    // Show dry-run warning
    if (dryRun && result.mutations && result.mutations.length > 0) {
      console.log("\n⚠️  Note: This was a dry run, so no changes were made.");
      console.log(
        `   ${result.mutations.length} mutation(s) would have been applied.`
      );
    }

    // Apply mutations if not dry-run
    if (!dryRun && result.mutations && result.mutations.length > 0) {
      console.log('\n❌ Error: Mutations cannot be applied via CLI (authentication required).');
      console.log('   Please use the web UI to apply changes, or run with --dry-run.');
      console.log(`   ${result.mutations.length} mutation(s) were blocked.`);
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
