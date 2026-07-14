import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskSkipButton from "@/components/TaskSkipButton";

const mocks = vi.hoisted(() => ({
	skipTask: vi.fn(),
	refresh: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => ({
	skipTask: mocks.skipTask,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: mocks.refresh,
	}),
}));

describe("TaskSkipButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.skipTask.mockResolvedValue(undefined);
	});

	it("skips immediately when the task has fewer than two skips this week", async () => {
		render(
			<TaskSkipButton
				taskId="task-1"
				taskTitle="Run"
				skipCountThisWeek={1}
				className="button"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Skip Today" }));

		await waitFor(() => {
			expect(mocks.skipTask).toHaveBeenCalledWith("task-1");
		});
		expect(screen.queryByRole("dialog", { name: "Skip this task again?" })).toBeNull();
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});

	it("asks for confirmation after two skips in the same week", async () => {
		render(
			<TaskSkipButton
				taskId="task-1"
				taskTitle="Run"
				skipCountThisWeek={2}
				className="button"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Skip Today" }));

		const dialog = screen.getByRole("dialog", {
			name: "Skip this task again?",
		});

		expect(dialog).toBeInTheDocument();
		expect(
			screen.getByText(/already skipped Run 2 times this week/i),
		).toBeInTheDocument();
		expect(mocks.skipTask).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Yes, Skip Today" }));

		await waitFor(() => {
			expect(mocks.skipTask).toHaveBeenCalledWith("task-1");
		});
		expect(mocks.refresh).toHaveBeenCalledTimes(1);
	});
});
