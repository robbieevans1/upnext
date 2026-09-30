import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TodosPage from "@/app/todos/page";

const mocks = vi.hoisted(() => ({
	userId: vi.fn(), findMany: vi.fn(), createTodo: vi.fn(), updateTodo: vi.fn(), setTodoCompleted: vi.fn(), deleteTodo: vi.fn(),
}));
vi.mock("@/lib/server-auth", () => ({ requireUserId: mocks.userId }));
vi.mock("@/lib/prisma", () => ({ prisma: { todo: { findMany: mocks.findMany } } }));
vi.mock("@/app/actions/todos", () => mocks);
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));

describe("To-do list page", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.userId.mockResolvedValue("user-1");
		mocks.createTodo.mockResolvedValue(undefined);
		mocks.findMany.mockResolvedValue([
			{ id: "todo-1", title: "Buy groceries", completedAt: null },
			{ id: "todo-2", title: "Book tickets", completedAt: new Date() },
		]);
	});

	it("loads saved items for only the signed-in account", async () => {
		render(await TodosPage());
		expect(mocks.findMany).toHaveBeenCalledWith({ where: { userId: "user-1" }, orderBy: [{ createdAt: "desc" }, { id: "asc" }] });
		expect(screen.getByRole("checkbox", { name: "Buy groceries" })).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Book tickets" })).toBeChecked();
		expect(screen.getByRole("link", { name: "To-do list" })).toHaveAttribute("href", "/todos");
	});

	it("adds items and clears the input after saving", async () => {
		render(await TodosPage());
		fireEvent.change(screen.getByLabelText("Add a to-do"), { target: { value: "Call dentist" } });
		fireEvent.click(screen.getByRole("button", { name: "Add" }));
		await waitFor(() => expect(screen.getByLabelText("Add a to-do")).toHaveValue(""));
		expect(mocks.createTodo).toHaveBeenCalledWith("Call dentist");
	});

	it("completes, reopens, edits, and deletes items", async () => {
		render(await TodosPage());
		fireEvent.click(screen.getByRole("checkbox", { name: "Buy groceries" }));
		await waitFor(() => expect(mocks.setTodoCompleted).toHaveBeenCalledWith("todo-1", true));
		fireEvent.click(screen.getByRole("checkbox", { name: "Book tickets" }));
		await waitFor(() => expect(mocks.setTodoCompleted).toHaveBeenCalledWith("todo-2", false));
		fireEvent.click(within(screen.getByRole("region", { name: "To do" })).getByRole("button", { name: "Edit" }));
		fireEvent.change(screen.getByLabelText("Edit to-do"), { target: { value: "Buy milk" } });
		fireEvent.click(screen.getByRole("button", { name: "Save" }));
		await waitFor(() => expect(screen.queryByLabelText("Edit to-do")).not.toBeInTheDocument());
		expect(mocks.updateTodo).toHaveBeenCalledWith("todo-1", "Buy milk");
		fireEvent.click(screen.getByRole("button", { name: "Delete Buy groceries" }));
		await waitFor(() => expect(mocks.deleteTodo).toHaveBeenCalledWith("todo-1"));
	});

	it("keeps input available for retry if saving fails", async () => {
		mocks.createTodo.mockRejectedValue(new Error("offline"));
		render(await TodosPage());
		fireEvent.change(screen.getByLabelText("Add a to-do"), { target: { value: "Call dentist" } });
		fireEvent.click(screen.getByRole("button", { name: "Add" }));
		expect(await screen.findByRole("alert")).toHaveTextContent("Could not save");
		expect(screen.getByLabelText("Add a to-do")).toHaveValue("Call dentist");
	});

	it("does not query data without authentication", async () => {
		mocks.userId.mockRejectedValue(new Error("redirect:/login"));
		await expect(TodosPage()).rejects.toThrow("redirect:/login");
		expect(mocks.findMany).not.toHaveBeenCalled();
	});
});
