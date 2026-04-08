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
        .option("-p, --port <port>", "Port to run the server on", "9000")
        .action(startCommand);
    await program.parseAsync(process.argv);
}
