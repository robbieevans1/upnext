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
		deleteMany: vi.fn(),
		upsert: vi.fn(),
	},
	taskSubtask: {
		count: vi.fn(),
		create: vi.fn(),
		findFirst: vi.fn(),
		findMany: vi.fn(),
		update: vi.fn((args) => args),
		updateMany: vi.fn(),
	},
	subtaskCompletion: {
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
const startTaskSession = vi.fn();
const stopActiveTaskSessionAndStartOther = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma }));
vi.mock("next-auth", () => ({ getServerSession }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/time-tracking", () => ({
	startTaskSession,
	stopActiveTaskSessionAndStartOther,
}));

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
				playbook: "  Keep phone away. Stay focused.  ",
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
				playbook: "Keep phone away. Stay focused.",
				isMandatory: true,
				groupId: "career",
				userId: "user-1",
				stackOrder: 3,
			},
		});
	});

	it("does not attach an empty subtask create when no subtasks are provided", async () => {
		prisma.task.count.mockResolvedValue(0);
		const { createTask } = await import("@/app/actions/tasks");

		await createTask(
			formDataFrom({
				title: "Read",
				subtasks: " \n \r\n ",
			}),
		);

		expect(prisma.task.create).toHaveBeenCalledWith({
			data: expect.not.objectContaining({
				subtasks: expect.anything(),
			}),
		});
	});

	it("does not create a task or subtasks without a task title", async () => {
		const { createTask } = await import("@/app/actions/tasks");

		await createTask(
			formDataFrom({
				title: "   ",
				subtasks: "This should not be created",
			}),
		);

		expect(prisma.task.create).not.toHaveBeenCalled();
		expect(prisma.taskSubtask.create).not.toHaveBeenCalled();
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

	it("creates initial subtasks without replacing task data", async () => {
		prisma.task.count.mockResolvedValue(2);
		const { createTask } = await import("@/app/actions/tasks");

		await createTask(
			formDataFrom({
				title: "Launch prep",
				description: "Prepare the launch.",
				subtasks: " Draft notes \n\n Review checklist \r\n Send update ",
			}),
		);

		expect(prisma.task.create).toHaveBeenCalledWith({
			data: {
				title: "Launch prep",
				description: "Prepare the launch.",
				playbook: "",
				isMandatory: false,
				groupId: null,
				userId: "user-1",
				stackOrder: 2,
				subtasks: {
					create: [
						{
							title: "Draft notes",
							userId: "user-1",
							stackOrder: 0,
						},
						{
							title: "Review checklist",
							userId: "user-1",
							stackOrder: 1,
						},
						{
							title: "Send update",
							userId: "user-1",
							stackOrder: 2,
						},
					],
				},
			},
		});
	});

	it("updates task description and playbook separately", async () => {
		const { updateTask } = await import("@/app/actions/tasks");

		await updateTask(
			formDataFrom({
				taskId: "task-1",
				title: "Work function",
				description: "Attend the event after work.",
				playbook: "Stand tall.\nSmile.\nAsk questions.",
				groupId: "",
				isMandatory: "on",
			}),
		);

		expect(prisma.task.update).toHaveBeenCalledWith({
			where: {
				id: "task-1",
			},
			data: {
				title: "Work function",
				description: "Attend the event after work.",
				playbook: "Stand tall.\nSmile.\nAsk questions.",
				isMandatory: true,
				groupId: null,
			},
		});
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

	it("adds subtasks only to active tasks owned by the current user", async () => {
		prisma.task.findFirst.mockResolvedValue({ id: "task-1" });
		prisma.taskSubtask.count.mockResolvedValue(4);
		const { addTaskSubtask } = await import("@/app/actions/tasks");

		await addTaskSubtask(
			formDataFrom({
				taskId: "task-1",
				title: "  Pack laptop  ",
			}),
		);

		expect(prisma.task.findFirst).toHaveBeenCalledWith({
			where: {
				id: "task-1",
				userId: "user-1",
				isActive: true,
			},
			select: {
				id: true,
			},
		});
		expect(prisma.taskSubtask.create).toHaveBeenCalledWith({
			data: {
				title: "Pack laptop",
				taskId: "task-1",
				userId: "user-1",
				stackOrder: 4,
			},
		});
	});

	it("does not add a subtask when the parent task is not owned by the user", async () => {
		prisma.task.findFirst.mockResolvedValue(null);
		const { addTaskSubtask } = await import("@/app/actions/tasks");

		await addTaskSubtask(
			formDataFrom({
				taskId: "other-user-task",
				title: "Nope",
			}),
		);

		expect(prisma.taskSubtask.create).not.toHaveBeenCalled();
	});

	it("does not add a blank subtask", async () => {
		const { addTaskSubtask } = await import("@/app/actions/tasks");

		await addTaskSubtask(
			formDataFrom({
				taskId: "task-1",
				title: "   ",
			}),
		);

		expect(prisma.task.findFirst).not.toHaveBeenCalled();
		expect(prisma.taskSubtask.create).not.toHaveBeenCalled();
	});

	it("updates and soft deletes subtasks through current-user scoped writes", async () => {
		const { deleteTaskSubtask, updateTaskSubtask } = await import(
			"@/app/actions/tasks"
		);

		await updateTaskSubtask(
			formDataFrom({
				subtaskId: "subtask-1",
				title: "  Print directions  ",
			}),
		);
		await deleteTaskSubtask("subtask-2");

		expect(prisma.taskSubtask.updateMany).toHaveBeenCalledWith({
			where: {
				id: "subtask-1",
				userId: "user-1",
				isActive: true,
			},
			data: {
				title: "Print directions",
			},
		});
		expect(prisma.taskSubtask.updateMany).toHaveBeenCalledWith({
			where: {
				id: "subtask-2",
				userId: "user-1",
				isActive: true,
			},
			data: {
				isActive: false,
			},
		});
	});

	it("does not update a subtask to a blank title", async () => {
		const { updateTaskSubtask } = await import("@/app/actions/tasks");

		await updateTaskSubtask(
			formDataFrom({
				subtaskId: "subtask-1",
				title: "   ",
			}),
		);

		expect(prisma.taskSubtask.updateMany).not.toHaveBeenCalled();
	});

	it("starts a task timer for the current user", async () => {
		const { startTaskTimer } = await import("@/app/actions/tasks");

		await startTaskTimer("task-1");

		expect(startTaskSession).toHaveBeenCalledWith("user-1", "task-1");
		expect(revalidatePath).toHaveBeenCalledWith("/downtime");
		expect(revalidatePath).toHaveBeenCalledWith("/today");
	});

	it("completes a task once per app day", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T15:30:00.000Z"));
		prisma.task.findFirst.mockResolvedValue({
			id: "task-1",
			groupId: null,
		});
		const { completeTask } = await import("@/app/actions/tasks");

		await completeTask("task-1");

		expect(stopActiveTaskSessionAndStartOther).toHaveBeenCalledWith(
			"user-1",
			"task-1",
		);
		expect(prisma.taskCompletion.upsert).toHaveBeenCalledWith({
			where: {
				taskId_completedOn: {
					taskId: "task-1",
					completedOn: new Date("2026-06-15T04:00:00.000Z"),
				},
			},
			update: {},
			create: {
				taskId: "task-1",
				userId: "user-1",
				completedOn: new Date("2026-06-15T04:00:00.000Z"),
			},
		});
		expect(prisma.subtaskCompletion.upsert).not.toHaveBeenCalled();
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it("completes a subtask once per app day and moves it to the bottom", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T15:30:00.000Z"));
		prisma.taskSubtask.findFirst.mockResolvedValue({
			id: "subtask-2",
			taskId: "task-1",
		});
		prisma.taskSubtask.findMany.mockResolvedValue([
			{ id: "subtask-1" },
			{ id: "subtask-3" },
		]);
		const { completeSubtask } = await import("@/app/actions/tasks");

		await completeSubtask("subtask-2");

		expect(prisma.taskSubtask.findFirst).toHaveBeenCalledWith({
			where: {
				id: "subtask-2",
				userId: "user-1",
				isActive: true,
				task: {
					isActive: true,
				},
			},
		});
		expect(prisma.subtaskCompletion.upsert).toHaveBeenCalledWith({
			where: {
				subtaskId_completedOn: {
					subtaskId: "subtask-2",
					completedOn: new Date("2026-06-15T04:00:00.000Z"),
				},
			},
			update: {},
			create: {
				subtaskId: "subtask-2",
				taskId: "task-1",
				userId: "user-1",
				completedOn: new Date("2026-06-15T04:00:00.000Z"),
			},
		});
		expect(prisma.$transaction).toHaveBeenCalledWith([
			{
				where: {
					id: "subtask-1",
				},
				data: {
					stackOrder: 0,
				},
			},
			{
				where: {
					id: "subtask-3",
				},
				data: {
					stackOrder: 1,
				},
			},
			{
				where: {
					id: "subtask-2",
				},
				data: {
					stackOrder: 2,
				},
			},
		]);
	});

	it("does not complete a missing or unauthorized subtask", async () => {
		prisma.taskSubtask.findFirst.mockResolvedValue(null);
		const { completeSubtask } = await import("@/app/actions/tasks");

		await completeSubtask("subtask-404");

		expect(prisma.subtaskCompletion.upsert).not.toHaveBeenCalled();
		expect(prisma.taskSubtask.findMany).not.toHaveBeenCalled();
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it("uses the Eastern calendar day for subtask completion after Eastern midnight", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T04:01:00.000Z"));
		prisma.taskSubtask.findFirst.mockResolvedValue({
			id: "subtask-1",
			taskId: "task-1",
		});
		prisma.taskSubtask.findMany.mockResolvedValue([]);
		const { completeSubtask } = await import("@/app/actions/tasks");

		await completeSubtask("subtask-1");

		expect(prisma.subtaskCompletion.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					subtaskId_completedOn: {
						subtaskId: "subtask-1",
						completedOn: new Date("2026-06-16T04:00:00.000Z"),
					},
				},
			}),
		);
	});

	it("uses the Eastern calendar day after Eastern midnight", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-16T04:01:00.000Z"));
		prisma.task.findFirst.mockResolvedValue({
			id: "task-1",
			groupId: null,
		});
		const { completeTask } = await import("@/app/actions/tasks");

		await completeTask("task-1");

		expect(prisma.taskCompletion.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					taskId_completedOn: {
						taskId: "task-1",
						completedOn: new Date("2026-06-16T04:00:00.000Z"),
					},
				},
			}),
		);
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

	it("undoes only today's completion for the current user", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-06-15T15:30:00.000Z"));
		const { undoTodayCompletion } = await import("@/app/actions/tasks");

		await undoTodayCompletion("task-1");

		expect(prisma.taskCompletion.deleteMany).toHaveBeenCalledWith({
			where: {
				taskId: "task-1",
				userId: "user-1",
				completedOn: new Date("2026-06-15T04:00:00.000Z"),
			},
		});
		expect(revalidatePath).toHaveBeenCalledWith("/today");
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
