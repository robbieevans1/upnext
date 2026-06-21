import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CompleteDayButton from "@/components/CompleteDayButton";
import { startTomorrowEarly } from "@/app/actions/day-start";

vi.mock("@/app/actions/day-start", () => ({
	startTomorrowEarly: vi.fn(),
}));

describe("CompleteDayButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("opens a confirmation modal before starting tomorrow early", () => {
		render(
			<CompleteDayButton
				isStartedEarly={false}
				tomorrowLabel="6/21/2026"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Complete Day" }));

		expect(
			screen.getByRole("dialog", { name: "Start tomorrow early?" }),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Tasks you have not completed today will stay incomplete/),
		).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Start Tomorrow" })).toBe(
			screen.getByText("Start Tomorrow"),
		);
	});

	it("cancels without calling the server action", () => {
		render(
			<CompleteDayButton
				isStartedEarly={false}
				tomorrowLabel="6/21/2026"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Complete Day" }));
		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(screen.queryByRole("dialog")).toBeNull();
		expect(startTomorrowEarly).not.toHaveBeenCalled();
	});

	it("shows an active status instead of another advance button", () => {
		render(
			<CompleteDayButton isStartedEarly tomorrowLabel="6/21/2026" />,
		);

		expect(screen.queryByRole("button", { name: "Complete Day" })).toBeNull();
		expect(
			screen.getByText("Tomorrow's stack is already active."),
		).toBeInTheDocument();
	});
});
