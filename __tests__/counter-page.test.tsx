import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CounterPage from "@/app/tools/counter/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("CounterPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("renders the counter tool for authenticated users", async () => {
		render(await CounterPage());

		expect(screen.getByRole("heading", { name: "Counter" })).toBeInTheDocument();
		expect(screen.getByText("Quick count")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Add 1" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
	});

	it("redirects unauthenticated users", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		await expect(CounterPage()).rejects.toThrow("redirect:/login");
		expect(mocks.redirect).toHaveBeenCalledWith("/login");
	});
});
