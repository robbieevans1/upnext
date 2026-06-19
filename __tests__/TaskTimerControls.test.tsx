import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskTimerControls from "@/components/TaskTimerControls";

const mocks = vi.hoisted(() => ({
	completeTask: vi.fn(),
	push: vi.fn(),
	refresh: vi.fn(),
	startTaskTimer: vi.fn(),
	stopTaskTimer: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => ({
	completeTask: mocks.completeTask,
	startTaskTimer: mocks.startTaskTimer,
	stopTaskTimer: mocks.stopTaskTimer,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mocks.push,
		refresh: mocks.refresh,
	}),
}));

describe("TaskTimerControls", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("starts normal tasks with the Start button", async () => {
		render(
			<TaskTimerControls
				taskId="task-1"
				taskTitle="Read"
				playbook={null}
				activeTaskSession={null}
				completeButtonClassName="complete"
				startButtonClassName="start"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Start" }));

		await waitFor(() => {
			expect(mocks.startTaskTimer).toHaveBeenCalledWith("task-1");
		});
		expect(mocks.refresh).toHaveBeenCalled();
	});

	it("continues completed tasks without undoing completion", async () => {
		render(
			<TaskTimerControls
				taskId="task-1"
				taskTitle="Read"
				playbook={null}
				activeTaskSession={null}
				isCompleted
				completeButtonClassName="complete"
				startButtonClassName="start"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Continue" }));

		await waitFor(() => {
			expect(mocks.startTaskTimer).toHaveBeenCalledWith("task-1");
		});
		expect(mocks.completeTask).not.toHaveBeenCalled();
		expect(mocks.stopTaskTimer).not.toHaveBeenCalled();
	});

	it("stops a running completed task instead of completing it again", async () => {
		const startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();

		render(
			<TaskTimerControls
				taskId="task-1"
				taskTitle="Read"
				playbook={null}
				activeTaskSession={{
					taskId: "task-1",
					startedAt,
				}}
				isCompleted
				completeButtonClassName="complete"
				startButtonClassName="start"
			/>,
		);

		expect(screen.getByText(/^00:30:/)).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Stop" }));

		await waitFor(() => {
			expect(mocks.stopTaskTimer).toHaveBeenCalledWith("task-1");
		});
		expect(mocks.completeTask).not.toHaveBeenCalled();
	});
});
