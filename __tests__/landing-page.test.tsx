import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LandingPage from "@/app/page";

const mocks = vi.hoisted(() => ({
	getServerSession: vi.fn(),
	redirect: vi.fn((path: string) => {
		throw new Error(`redirect:${path}`);
	}),
}));

vi.mock("next-auth", () => ({
	getServerSession: mocks.getServerSession,
}));

vi.mock("next/navigation", () => ({
	redirect: mocks.redirect,
}));

describe("LandingPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("links logged-out visitors to the public about page", async () => {
		mocks.getServerSession.mockResolvedValue(null);

		render(await LandingPage());

		expect(screen.getByRole("link", { name: "About" })).toHaveAttribute(
			"href",
			"/about",
		);
		expect(screen.getByRole("link", { name: "Learn more" })).toHaveAttribute(
			"href",
			"/about",
		);
	});

	it("redirects logged-in users to today", async () => {
		mocks.getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});

		await expect(LandingPage()).rejects.toThrow("redirect:/today");

		expect(mocks.redirect).toHaveBeenCalledWith("/today");
	});
});
