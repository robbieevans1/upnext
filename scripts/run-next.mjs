import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

const mode = process.argv[2];
const root = process.cwd();
const nextDir = path.join(root, ".next");
const devPidFile = path.join(root, ".upnext-dev.pid");

function isPidRunning(pid) {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

async function readDevPid() {
	try {
		const value = await fs.readFile(devPidFile, "utf8");
		const pid = Number(value.trim());

		return Number.isInteger(pid) && pid > 0 ? pid : null;
	} catch {
		return null;
	}
}

async function ensureNoDevServer() {
	const pid = await readDevPid();

	if (!pid) {
		return;
	}

	if (isPidRunning(pid)) {
		console.error(
			`UpNext dev server already appears to be running with PID ${pid}. Stop it before running another dev/build command.`,
		);
		process.exit(1);
	}

	await fs.rm(devPidFile, { force: true });
}

async function cleanNextOutput() {
	await fs.rm(nextDir, { recursive: true, force: true });
	await fs.mkdir(nextDir, { recursive: true });
}

function run(command, args, options = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			env: options.env ? { ...process.env, ...options.env } : process.env,
			stdio: "inherit",
			shell: process.platform === "win32",
		});

		child.on("error", reject);
		child.on("exit", (code, signal) => {
			if (signal) {
				reject(new Error(`${command} exited from signal ${signal}`));
				return;
			}

			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`${command} exited with code ${code ?? 1}`));
		});
	});
}

async function runDev() {
	await ensureNoDevServer();
	await cleanNextOutput();
	await fs.writeFile(devPidFile, `${process.pid}\n`);

	const child = spawn("next", ["dev"], {
		stdio: "inherit",
		shell: process.platform === "win32",
	});

	async function cleanup() {
		await fs.rm(devPidFile, { force: true });
	}

	for (const signal of ["SIGINT", "SIGTERM"]) {
		process.on(signal, async () => {
			child.kill(signal);
			await cleanup();
			process.exit(0);
		});
	}

	child.on("error", async (error) => {
		await cleanup();
		throw error;
	});

	child.on("exit", async (code) => {
		await cleanup();
		process.exit(code ?? 0);
	});
}

async function runBuild() {
	await ensureNoDevServer();
	await cleanNextOutput();
	await run("prisma", ["generate"]);
	await run("next", ["build"], {
		env: {
			NEXT_PRIVATE_BUILD_WORKER: "0",
		},
	});
}

if (mode === "dev") {
	await runDev();
} else if (mode === "build") {
	await runBuild();
} else {
	console.error("Usage: node scripts/run-next.mjs <dev|build>");
	process.exit(1);
}
