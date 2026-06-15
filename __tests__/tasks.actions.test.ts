import { beforeEach, describe, expect, it, vi } from "vitest";
import { formDataFrom } from "./test-utils";

const prisma = {
	$transaction: vi.fn(async (operations: unknown[]) => operations),
	task: {
		count: vi.fn(),
		create: vi.fn(),
		findFirst: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn((args) => args),
	},
	taskCompletion: {
		upsert: vi.fn(),
	},
	taskGroup: {
		create: vi.fn(),
		update: vi.fn(),
	},
};

const getServerSession = vi.fn();
const redirect = vi.fn((path: string) => {
	throw new Error(`redirect:${path}`);
});
const revalidatePath = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));

describe("task server actions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
		getServerSession.mockResolvedValue({
			user: {
				id: "user-1",
			},
		});
	});

	it("creates task groups for the current user and trims optional fields", async () => {
		const { createTaskGroup } = await import("@/app/actions/tasks");

		await createTaskGroup(
			formDataFrom({
				name: "  Career  ",
				description: "  Software work  ",
			}),
		);

		expect(prisma.taskGroup.create).toHaveBeenCalledWith({
			data: {
				name: "Career",
				description: "Software work",
				userId: "user-1",
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/");
		expect(revalidatePath).toHaveBeenCalledWith("/tasks");
	});

	it("does not create a task group without a name", async () => {
		const { createTaskGroup } = await import("@/app/actions/tasks");

		await createTaskGroup(formDataFrom({ name: "   " }));

		expect(prisma.taskGroup.create).not.toHaveBeenCalled();
	});

	it("creates tasks at the bottom of the matching active stack", async () => {
		prisma.task.count.mockResolvedValue(3);
		const { createTask } = await import("@/app/actions/tasks");

		await createTask(
			formDataFrom({
				title: "  Portfolio Project  ",
				description: "  Ship a feature  ",
				groupId: "career",
				isMandatory: "on",
			}),
		);

		expect(prisma.task.count).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				isActive: true,
				groupId: "career",
			},
		});
		expect(prisma.task.create).toHaveBeenCalledWith({
			data: {
				title: "Portfolio Project",
				description: "Ship a feature",
				isMandatory: true,
				groupId: "career",
				userId: "user-1",
				stackOrder: 3,
			},
		});
	});

	it("stores ungrouped tasks with a null group id", async () => {
		prisma.task.count.mockResolvedValue(1);
		const { createTask } = await import("@/app/actions/tasks");

		await createTask(
			formDataFrom({
				title: "Gym",
				groupId: "",
			}),
		);

		expect(prisma.task.count).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				isActive: true,
				groupId: null,
			},
		});
		expect(prisma.task.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					groupId: null,
					isMandatory: false,
				}),
			}),
		);
	});

	it("soft deletes a group and all of its tasks", async () => {
		const { deleteTaskGroup } = await import("@/app/actions/tasks");

		await deleteTaskGroup("group-1");

		expect(prisma.taskGroup.update).toHaveBeenCalledWith({
			where: {
				id: "group-1",
			},
			data: {
				isActive: false,
				tasks: {
					updateMany: {
						where: {},
						data: {
							isActive: false,
						},
					},
				},
			},
		});
	});

	it("completes a task once per local day", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T15:30:00.000Z"));
		prisma.task.findFirst.mockResolvedValue({
			id: "task-1",
			groupId: null,
		});
		const { completeTask } = await import("@/app/actions/tasks");

		await completeTask("task-1");

		expect(prisma.taskCompletion.upsert).toHaveBeenCalledWith({
			where: {
				taskId_completedOn: {
					taskId: "task-1",
					completedOn: new Date(2026, 5, 15),
				},
			},
			update: {},
			create: {
				taskId: "task-1",
				userId: "user-1",
				completedOn: new Date(2026, 5, 15),
			},
		});
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it("moves a completed grouped task to the bottom of its group stack", async () => {
		prisma.task.findFirst.mockResolvedValue({
			id: "task-2",
			groupId: "career",
		});
		prisma.task.findMany.mockResolvedValue([{ id: "task-1" }, { id: "task-3" }]);
		const { completeTask } = await import("@/app/actions/tasks");

		await completeTask("task-2");

		expect(prisma.task.findMany).toHaveBeenCalledWith({
			where: {
				userId: "user-1",
				groupId: "career",
				isActive: true,
				id: {
					not: "task-2",
				},
			},
			orderBy: {
				stackOrder: "asc",
			},
		});
		expect(prisma.$transaction).toHaveBeenCalledWith([
			{
				where: {
					id: "task-1",
				},
				data: {
					stackOrder: 0,
				},
			},
			{
				where: {
					id: "task-3",
				},
				data: {
					stackOrder: 1,
				},
			},
			{
				where: {
					id: "task-2",
				},
				data: {
					stackOrder: 2,
				},
			},
		]);
	});

	it("redirects unauthenticated users before mutating data", async () => {
		getServerSession.mockResolvedValue(null);
		const { createTask } = await import("@/app/actions/tasks");

		await expect(
			createTask(formDataFrom({ title: "Nope" })),
		).rejects.toThrow("redirect:/login");

		expect(redirect).toHaveBeenCalledWith("/login");
		expect(prisma.task.create).not.toHaveBeenCalled();
	});
});
