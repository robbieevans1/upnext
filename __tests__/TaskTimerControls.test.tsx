import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskTimerControls from "@/components/TaskTimerControls";

const mocks = vi.hoisted(() => ({
	completeTask: vi.fn(),
	push: vi.fn(),
	refresh: vi.fn(),
	startTaskTimer: vi.fn(),
	stopTaskTimer: vi.fn(),
	updateTaskPlaybook: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => ({
	completeTask: mocks.completeTask,
	startTaskTimer: mocks.startTaskTimer,
	stopTaskTimer: mocks.stopTaskTimer,
	updateTaskPlaybook: mocks.updateTaskPlaybook,
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

	it("continues paused tasks that already have time tracked", async () => {
		render(
			<TaskTimerControls
				taskId="task-1"
				taskTitle="Read"
				playbook={null}
				activeTaskSession={null}
				hasTrackedTime
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

	it("pauses a running completed task instead of completing it again", async () => {
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
				initialElapsedSeconds={30 * 60}
				isCompleted
				completeButtonClassName="complete"
				startButtonClassName="start"
			/>,
		);

		expect(screen.getByText("00:30:00")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Pause" }));

		await waitFor(() => {
			expect(mocks.stopTaskTimer).toHaveBeenCalledWith("task-1");
		});
		expect(mocks.completeTask).not.toHaveBeenCalled();
	});

	it("shows pause and complete controls for a running unfinished task", async () => {
		const startedAt = new Date(Date.now() - 15 * 60 * 1000).toISOString();

		render(
			<TaskTimerControls
				taskId="task-1"
				taskTitle="Read"
				playbook={null}
				activeTaskSession={{
					taskId: "task-1",
					startedAt,
				}}
				initialElapsedSeconds={15 * 60}
				completeButtonClassName="complete"
				startButtonClassName="start"
			/>,
		);

		expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Complete" })).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Pause" }));

		await waitFor(() => {
			expect(mocks.stopTaskTimer).toHaveBeenCalledWith("task-1");
		});
		expect(mocks.completeTask).not.toHaveBeenCalled();
	});

	it("renders a running task from the server-provided elapsed time", () => {
		render(
			<TaskTimerControls
				taskId="task-1"
				taskTitle="Read"
				playbook={null}
				activeTaskSession={{
					taskId: "task-1",
					startedAt: "2026-06-24T12:00:00.000Z",
				}}
				initialElapsedSeconds={23 * 60 + 53}
				completeButtonClassName="complete"
				startButtonClassName="start"
			/>,
		);

		expect(screen.getByText("00:23:53")).toBeInTheDocument();
	});
});
