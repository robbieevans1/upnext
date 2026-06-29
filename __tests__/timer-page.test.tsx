import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TimerPage from "@/app/tools/timer/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("TimerPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("renders the timer tool for authenticated users", async () => {
		render(await TimerPage());

		expect(screen.getByRole("heading", { name: "Timer" })).toBeInTheDocument();
		expect(screen.getByText("Flexible timer")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Add minutes" }),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Save time" })).toBeInTheDocument();
		expect(screen.getByText("Saved entries")).toBeInTheDocument();
	});

	it("redirects unauthenticated users", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		await expect(TimerPage()).rejects.toThrow("redirect:/login");
		expect(mocks.redirect).toHaveBeenCalledWith("/login");
	});
});
