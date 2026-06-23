import { spawn } from "node:child_process";

const port = process.env.SMOKE_PORT ?? "3100";
const baseUrl = `http://127.0.0.1:${port}`;
const routes = ["/", "/today", "/dashboard", "/nutrition", "/announcements"];

function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(process) {
	const deadline = Date.now() + 30_000;

	while (Date.now() < deadline) {
		if (process.exitCode !== null) {
			throw new Error(`next start exited early with code ${process.exitCode}`);
		}

		try {
			const response = await fetch(baseUrl, {
				redirect: "manual",
			});

			if (response.status < 500) {
				return;
			}
		} catch {
			// The server is not ready yet.
		}

		await wait(500);
	}

	throw new Error("Timed out waiting for the built app to start.");
}

async function assertRoute(route) {
	const response = await fetch(`${baseUrl}${route}`, {
		redirect: "manual",
	});

	if (response.status >= 500) {
		const body = await response.text();
		throw new Error(
			`${route} returned ${response.status}.\n${body.slice(0, 1000)}`,
		);
	}

	console.log(`${route} -> ${response.status}`);
}

async function stopServer(server) {
	if (server.exitCode !== null || server.signalCode !== null) {
		return;
	}

	server.kill("SIGTERM");

	await Promise.race([
		new Promise((resolve) => server.once("exit", resolve)),
		wait(5_000).then(() => {
			if (server.exitCode === null && server.signalCode === null) {
				server.kill("SIGKILL");
			}
		}),
	]);

	server.stdout?.destroy();
	server.stderr?.destroy();
	server.unref();
}

const server = spawn("npx", ["next", "start", "-p", port], {
	env: {
		...process.env,
		NEXTAUTH_URL: baseUrl,
	},
	stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => {
	process.stdout.write(chunk);
});
server.stderr.on("data", (chunk) => {
	process.stderr.write(chunk);
});

try {
	await waitForServer(server);

	for (const route of routes) {
		await assertRoute(route);
	}
} finally {
	await stopServer(server);
}
