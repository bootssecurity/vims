import ora from "ora";
import chalk from "chalk";
export class Reporter {
    constructor() {
        this.activities = new Map();
    }
    activity(message) {
        const spinner = ora({
            text: chalk.blue(message),
            spinner: "dots",
        }).start();
        const id = Math.random().toString(36).substring(7);
        this.activities.set(id, { spinner, start: Date.now() });
        return id;
    }
    success(id, message) {
        const activity = this.activities.get(id);
        if (activity) {
            const duration = Date.now() - activity.start;
            const text = message || activity.spinner.text;
            activity.spinner.succeed(`${chalk.green(text)} ${chalk.gray(`(${duration}ms)`)}`);
            this.activities.delete(id);
        }
    }
    error(id, message) {
        const activity = this.activities.get(id);
        if (activity) {
            activity.spinner.fail(chalk.red(message));
            this.activities.delete(id);
        }
    }
    info(message) {
        console.log(`${chalk.blue("ℹ")} ${message}`);
    }
    warn(message) {
        console.log(`${chalk.yellow("⚠")} ${message}`);
    }
    log(message) {
        console.log(message);
    }
}
export const reporter = new Reporter();
