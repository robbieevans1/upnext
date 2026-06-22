import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";

const mocks = vi.hoisted(() => ({
	refresh: vi.fn(),
	updateTaskPlaybook: vi.fn(),
}));

vi.mock("@/app/actions/tasks", () => ({
	updateTaskPlaybook: mocks.updateTaskPlaybook,
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: mocks.refresh,
	}),
}));

describe("TaskPlaybookButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("opens a playbook dialog with task notes", () => {
		render(
			<TaskPlaybookButton
				taskTitle="Go to work function"
				playbook={"Stand tall.\nSmile.\nAsk questions."}
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Playbook" }));

		const dialog = screen.getByRole("dialog", { name: "Go to work function" });

		expect(dialog).toBeInTheDocument();
		expect(dialog).toHaveTextContent("Stand tall.");
		expect(dialog).toHaveTextContent("Smile.");
		expect(dialog).toHaveTextContent("Ask questions.");
	});

	it("highlights the button when requested and playbook notes exist", () => {
		const { rerender } = render(
			<TaskPlaybookButton
				taskTitle="Go to work function"
				playbook="Stand tall."
				highlightWhenHasPlaybook
			/>,
		);

		expect(screen.getByRole("button", { name: "Playbook" })).toHaveClass(
			"border-amber-400/70",
			"bg-amber-400/10",
			"text-amber-100",
		);

		rerender(
			<TaskPlaybookButton
				taskTitle="Go to work function"
				playbook="   "
				highlightWhenHasPlaybook
			/>,
		);

		expect(screen.getByRole("button", { name: "Playbook" })).toHaveClass(
			"border-slate-700",
			"text-slate-200",
		);
	});

	it("edits and saves task playbook notes when a task id is provided", async () => {
		render(
			<TaskPlaybookButton
				taskId="task-1"
				taskTitle="Go to work function"
				playbook="Stand tall."
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Playbook" }));

		const notes = screen.getByRole("textbox", { name: "Playbook notes" });
		fireEvent.change(notes, {
			target: {
				value: "Stand tall.\nSmile.",
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Save Playbook" }));

		await waitFor(() => {
			expect(mocks.updateTaskPlaybook).toHaveBeenCalledWith(expect.any(FormData));
		});
		const formData = mocks.updateTaskPlaybook.mock.calls[0][0] as FormData;
		expect(formData.get("taskId")).toBe("task-1");
		expect(formData.get("playbook")).toBe("Stand tall.\nSmile.");
		expect(mocks.refresh).toHaveBeenCalled();
	});

	it("shows an empty state when a task has no playbook", () => {
		render(<TaskPlaybookButton taskTitle="Gym" playbook={null} />);

		fireEvent.click(screen.getByRole("button", { name: "Playbook" }));

		expect(screen.getByRole("dialog", { name: "Gym" })).toBeInTheDocument();
		expect(screen.getByText("No playbook yet.")).toBeInTheDocument();
		expect(
			screen.getByText(
				"Add reminders, steps, mindset cues, or mistakes to avoid from the Tasks page.",
			),
		).toBeInTheDocument();
	});

	it("closes the playbook dialog", () => {
		render(<TaskPlaybookButton taskTitle="Study" playbook="Review notes." />);

		fireEvent.click(screen.getByRole("button", { name: "Playbook" }));
		fireEvent.click(screen.getByRole("button", { name: "Close playbook" }));

		expect(screen.queryByRole("dialog", { name: "Study" })).toBeNull();
	});
});
