import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PomodoroPage from "@/app/tools/pomodoro/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));

describe("PomodoroPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("renders the pomodoro tool for authenticated users", async () => {
		render(await PomodoroPage());

		expect(screen.getByRole("heading", { name: "Pomodoro" })).toBeInTheDocument();
		expect(screen.getByText("Work minutes")).toBeInTheDocument();
		expect(screen.getByText("Break minutes")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "Next session" }),
		).toBeInTheDocument();
	});

	it("redirects unauthenticated users", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		await expect(PomodoroPage()).rejects.toThrow("redirect:/login");
		expect(mocks.redirect).toHaveBeenCalledWith("/login");
	});
});
