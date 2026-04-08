import { Command } from "commander";
import { startCommand } from "./commands/start.js";
export async function run() {
    const program = new Command();
    program
        .name("vims")
        .description("VIMS Framework official CLI")
        .version("0.1.0");
    program
        .command("start")
        .description("Start the VIMS Express API server on port 9000")
        .option("-p, --port <number>", "Port to run the VIMS server on", "9005")
        .option("-d, --directory <path>", "Absolute or relative path to the VIMS project source", ".")
        .option("--no-build", "Skip the automatic platform build phase")
        .option("--skip-health", "Skip the infrastructure connectivity and speed tests")
        .option("--no-kill", "Do not automatically kill processes on the target port")
        .action(startCommand);
    await program.parseAsync(process.argv);
}
