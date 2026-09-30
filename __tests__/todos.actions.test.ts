import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTodo, updateTodo, setTodoCompleted, deleteTodo } from "@/app/actions/todos";

const mocks = vi.hoisted(() => ({
	userId: vi.fn(),
	create: vi.fn(),
	updateMany: vi.fn(),
	deleteMany: vi.fn(),
	revalidatePath: vi.fn(),
}));
vi.mock("@/lib/server-auth", () => ({ requireUserId: mocks.userId }));
vi.mock("@/lib/prisma", () => ({ prisma: { todo: mocks } }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));

describe("personal to-do actions", () => {
	beforeEach(() => { vi.clearAllMocks(); mocks.userId.mockResolvedValue("user-1"); });

	it("saves a trimmed title under the authenticated user", async () => {
		await createTodo("  Buy groceries  ");
		expect(mocks.create).toHaveBeenCalledWith({ data: { userId: "user-1", title: "Buy groceries" } });
		expect(mocks.revalidatePath).toHaveBeenCalledWith("/todos");
	});

	it.each(["   ", "x".repeat(301)])("rejects an invalid title", async (title) => {
		await expect(createTodo(title)).rejects.toThrow("Enter a to-do");
		await expect(updateTodo("todo-1", title)).rejects.toThrow("Enter a to-do");
		expect(mocks.create).not.toHaveBeenCalled();
		expect(mocks.updateMany).not.toHaveBeenCalled();
	});

	it("scopes editing, completing, reopening, and deleting to the current user", async () => {
		await updateTodo("other-users-id", "Edited");
		await setTodoCompleted("other-users-id", true);
		await setTodoCompleted("other-users-id", false);
		await deleteTodo("other-users-id");
		const where = { id: "other-users-id", userId: "user-1" };
		expect(mocks.updateMany).toHaveBeenNthCalledWith(1, { where, data: { title: "Edited" } });
		expect(mocks.updateMany).toHaveBeenNthCalledWith(2, { where, data: { completedAt: expect.any(Date) } });
		expect(mocks.updateMany).toHaveBeenNthCalledWith(3, { where, data: { completedAt: null } });
		expect(mocks.deleteMany).toHaveBeenCalledWith({ where });
	});

	it("requires authentication before every mutation", async () => {
		mocks.userId.mockRejectedValue(new Error("redirect:/login"));
		for (const action of [() => createTodo("Title"), () => updateTodo("id", "Title"), () => setTodoCompleted("id", true), () => deleteTodo("id")]) {
			await expect(action()).rejects.toThrow("redirect:/login");
		}
		expect(mocks.create).not.toHaveBeenCalled();
		expect(mocks.updateMany).not.toHaveBeenCalled();
		expect(mocks.deleteMany).not.toHaveBeenCalled();
	});
});
