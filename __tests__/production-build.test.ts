import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ spawn: vi.fn() }));
vi.mock("node:child_process", () => ({ spawn: mocks.spawn, default: { spawn: mocks.spawn } }));
vi.mock("node:fs/promises", () => ({
	default: { readFile: vi.fn().mockRejectedValue(new Error("No PID file")), rm: vi.fn(), mkdir: vi.fn() },
}));

describe("production build migrations", () => {
	const originalArgs = process.argv;
	beforeEach(() => {
		vi.resetModules();
		vi.clearAllMocks();
		process.argv = ["node", "scripts/run-next.mjs", "build"];
		mocks.spawn.mockImplementation(() => {
			const child = new EventEmitter();
			queueMicrotask(() => child.emit("exit", 0));
			return child;
		});
	});
	afterEach(() => { process.argv = originalArgs; vi.unstubAllEnvs(); });

	async function build() {
		// Import the actual build entry point while mocking filesystem and subprocesses.
		const script = "../scripts/run-next.mjs";
		await import(script);
	}

	it("applies production migrations before building Next.js", async () => {
		vi.stubEnv("VERCEL_ENV", "production");
		await build();
		expect(mocks.spawn.mock.calls.map(([command, args]) => [command, args])).toEqual([
			["prisma", ["generate"]], ["prisma", ["migrate", "deploy"]], ["next", ["build"]],
		]);
	});

	it.each(["preview", "development", ""])("does not migrate during %s builds", async (environment) => {
		vi.stubEnv("VERCEL_ENV", environment);
		await build();
		expect(mocks.spawn.mock.calls.map(([command, args]) => [command, args])).toEqual([
			["prisma", ["generate"]], ["next", ["build"]],
		]);
	});

	it("stops the build if a migration fails", async () => {
		vi.stubEnv("VERCEL_ENV", "production");
		mocks.spawn.mockImplementation((_command, args: string[]) => {
			const child = new EventEmitter();
			queueMicrotask(() => child.emit("exit", args[0] === "migrate" ? 1 : 0));
			return child;
		});
		await expect(build()).rejects.toThrow("prisma exited with code 1");
		expect(mocks.spawn.mock.calls.some(([command]) => command === "next")).toBe(false);
	});
});
