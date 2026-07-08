import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DailyReviewPrompt from "@/components/DailyReviewPrompt";

const mocks = vi.hoisted(() => ({
	refresh: vi.fn(),
	saveDailyReview: vi.fn(),
}));

vi.mock("@/app/actions/daily-review", () => ({
	saveDailyReview: mocks.saveDailyReview,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: mocks.refresh,
	}),
}));

describe("DailyReviewPrompt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("opens automatically when yesterday has unanswered checks", () => {
		render(
			<DailyReviewPrompt
				targetDayKey="2026-06-18"
				targetDayLabel="6/18/2026"
				checks={[
					{
						id: "check-1",
						title: "Was below calorie limit?",
						description: null,
						result: null,
					},
				]}
			/>,
		);

		expect(
			screen.getByRole("dialog", { name: "Yesterday Review" }),
		).toBeInTheDocument();
		expect(screen.getByText("1 of 1 checks still need an answer.")).toBeInTheDocument();
	});

	it("closes the prompt for the current page session without saving answers", () => {
		const { unmount } = render(
			<DailyReviewPrompt
				targetDayKey="2026-06-18"
				targetDayLabel="6/18/2026"
				checks={[
					{
						id: "check-1",
						title: "Was below calorie limit?",
						description: null,
						result: null,
					},
				]}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Do Later" }));

		expect(screen.queryByRole("dialog", { name: "Yesterday Review" })).toBeNull();
		expect(mocks.saveDailyReview).not.toHaveBeenCalled();
		expect(mocks.refresh).not.toHaveBeenCalled();

		unmount();

		render(
			<DailyReviewPrompt
				targetDayKey="2026-06-18"
				targetDayLabel="6/18/2026"
				checks={[
					{
						id: "check-1",
						title: "Was below calorie limit?",
						description: null,
						result: null,
					},
				]}
			/>,
		);

		expect(
			screen.getByRole("dialog", { name: "Yesterday Review" }),
		).toBeInTheDocument();
	});

	it("can be reopened to update answered checks", () => {
		render(
			<DailyReviewPrompt
				targetDayKey="2026-06-18"
				targetDayLabel="6/18/2026"
				checks={[
					{
						id: "check-1",
						title: "Was below calorie limit?",
						description: null,
						result: "YES",
					},
				]}
			/>,
		);

		expect(screen.queryByRole("dialog", { name: "Yesterday Review" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "Update Review" }));

		expect(
			screen.getByRole("dialog", { name: "Yesterday Review" }),
		).toBeInTheDocument();
		expect(screen.getByLabelText("Yes")).toBeChecked();
	});
});
