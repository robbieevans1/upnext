import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";

describe("TaskPlaybookButton", () => {
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
