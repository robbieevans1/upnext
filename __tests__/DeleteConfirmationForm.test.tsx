import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteConfirmationForm from "@/components/DeleteConfirmationForm";

const refreshMock = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		refresh: refreshMock,
	}),
}));

describe("DeleteConfirmationForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("opens a confirmation modal before running the delete action", async () => {
		const confirmAction = vi.fn().mockResolvedValue(undefined);

		render(
			<DeleteConfirmationForm
				confirmAction={confirmAction}
				triggerLabel="Delete Task"
				itemLabel='the task "Read"'
				confirmLabel="Delete Task"
			/>,
		);

		fireEvent.click(screen.getByRole("button", { name: "Delete Task" }));

		expect(
			screen.getByRole("dialog", { name: "Confirm Deletion" }),
		).toBeInTheDocument();
		expect(screen.getByText('Delete the task "Read"? This will remove it from the active Tasks page.')).toBeInTheDocument();
		expect(confirmAction).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(confirmAction).not.toHaveBeenCalled();

		fireEvent.click(screen.getByRole("button", { name: "Delete Task" }));
		fireEvent.click(screen.getAllByRole("button", { name: "Delete Task" })[1]);

		await waitFor(() => {
			expect(confirmAction).toHaveBeenCalledTimes(1);
		});
		expect(refreshMock).toHaveBeenCalledTimes(1);
	});
});
