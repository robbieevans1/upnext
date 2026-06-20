"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";
import { getAppTodayDate } from "@/lib/app-date";
import {
	startTaskSession,
	stopActiveTaskSessionAndStartOther,
} from "@/lib/time-tracking";

// const DEMO_USER_ID = "demo-user";

function revalidateTaskViews() {
	revalidatePath("/");
	revalidatePath("/today");
	revalidatePath("/tasks");
}

function getSubtaskTitles(formData: FormData) {
	return String(formData.get("subtasks") ?? "")
		.split(/\r?\n/)
		.map((title) => title.trim())
		.filter(Boolean);
}

async function getOwnedGroupId(userId: string, groupIdValue: string) {
	if (!groupIdValue) {
		return null;
	}

	const group = await prisma.taskGroup.findFirst({
		where: {
			id: groupIdValue,
			userId,
			isActive: true,
		},
		select: {
			id: true,
		},
	});

	return group?.id ?? null;
}

export async function createTaskGroup(formData: FormData) {
	const userId = await requireUserId();

	const name = String(formData.get("name") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();

	if (!name) return;

	await prisma.taskGroup.create({
		data: {
			name,
			description,
			userId,
		},
	});

	revalidateTaskViews();
}

export async function updateTaskGroup(formData: FormData) {
	const userId = await requireUserId();
	const groupId = String(formData.get("groupId") ?? "");
	const name = String(formData.get("name") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();

	if (!groupId || !name) return;

	await prisma.taskGroup.updateMany({
		where: {
			id: groupId,
			userId,
			isActive: true,
		},
		data: {
			name,
			description,
		},
	});

	revalidateTaskViews();
}

export async function deleteTaskGroup(groupId: string) {
	const userId = await requireUserId();

	await prisma.$transaction([
		prisma.taskGroup.updateMany({
			where: {
				id: groupId,
				userId,
				isActive: true,
			},
			data: {
				isActive: false,
			},
		}),
		prisma.task.updateMany({
			where: {
				groupId,
				userId,
				isActive: true,
			},
			data: {
				isActive: false,
			},
		}),
	]);

	revalidateTaskViews();
}

export async function createTask(formData: FormData) {
	const userId = await requireUserId();

	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const groupIdValue = String(formData.get("groupId") ?? "");
	const isMandatory = formData.get("isMandatory") === "on";

	if (!title) return;

	const groupId = await getOwnedGroupId(userId, groupIdValue);
	const subtaskTitles = getSubtaskTitles(formData);

	const existingTasksInStack = await prisma.task.count({
		where: {
			userId,
			isActive: true,
			groupId,
		},
	});

	await prisma.task.create({
		data: {
			title,
			description,
			playbook,
			isMandatory,
			groupId,
			userId,
			stackOrder: existingTasksInStack,
			...(subtaskTitles.length > 0
				? {
						subtasks: {
							create: subtaskTitles.map((subtaskTitle, index) => ({
								title: subtaskTitle,
								userId,
								stackOrder: index,
							})),
						},
					}
				: {}),
		},
	});

	revalidateTaskViews();
}

export async function updateTask(formData: FormData) {
	const userId = await requireUserId();
	const taskId = String(formData.get("taskId") ?? "");
	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const groupIdValue = String(formData.get("groupId") ?? "");
	const isMandatory = formData.get("isMandatory") === "on";

	if (!taskId || !title) return;

	const groupId = await getOwnedGroupId(userId, groupIdValue);

	await prisma.task.updateMany({
		where: {
			id: taskId,
			userId,
			isActive: true,
		},
		data: {
			title,
			description,
			playbook,
			isMandatory,
			groupId,
		},
	});

	revalidateTaskViews();
}

export async function deleteTask(taskId: string) {
	const userId = await requireUserId();

	await prisma.task.updateMany({
		where: {
			id: taskId,
			userId,
			isActive: true,
		},
		data: {
			isActive: false,
		},
	});

	revalidateTaskViews();
}

export async function addTaskSubtask(formData: FormData) {
	const userId = await requireUserId();

	const taskId = String(formData.get("taskId") ?? "");
	const title = String(formData.get("title") ?? "").trim();

	if (!taskId || !title) return;

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			userId,
			isActive: true,
		},
		select: {
			id: true,
		},
	});

	if (!task) return;

	const existingSubtasks = await prisma.taskSubtask.count({
		where: {
			taskId,
			userId,
			isActive: true,
		},
	});

	await prisma.taskSubtask.create({
		data: {
			title,
			taskId,
			userId,
			stackOrder: existingSubtasks,
		},
	});

	revalidateTaskViews();
}

export async function updateTaskSubtask(formData: FormData) {
	const userId = await requireUserId();

	const subtaskId = String(formData.get("subtaskId") ?? "");
	const title = String(formData.get("title") ?? "").trim();

	if (!subtaskId || !title) return;

	await prisma.taskSubtask.updateMany({
		where: {
			id: subtaskId,
			userId,
			isActive: true,
		},
		data: {
			title,
		},
	});

	revalidateTaskViews();
}

export async function deleteTaskSubtask(subtaskId: string) {
	const userId = await requireUserId();

	await prisma.taskSubtask.updateMany({
		where: {
			id: subtaskId,
			userId,
			isActive: true,
		},
		data: {
			isActive: false,
		},
	});

	revalidateTaskViews();
}

export async function completeSubtask(subtaskId: string) {
	const userId = await requireUserId();
	const today = getAppTodayDate();

	const subtask = await prisma.taskSubtask.findFirst({
		where: {
			id: subtaskId,
			userId,
			isActive: true,
			task: {
				isActive: true,
			},
		},
	});

	if (!subtask) return;

	await prisma.subtaskCompletion.upsert({
		where: {
			subtaskId_completedOn: {
				subtaskId,
				completedOn: today,
			},
		},
		update: {},
		create: {
			subtaskId,
			taskId: subtask.taskId,
			userId,
			completedOn: today,
		},
	});

	const remainingSubtasks = await prisma.taskSubtask.findMany({
		where: {
			taskId: subtask.taskId,
			userId,
			isActive: true,
			id: {
				not: subtask.id,
			},
		},
		orderBy: {
			stackOrder: "asc",
		},
	});

	await prisma.$transaction([
		...remainingSubtasks.map((remainingSubtask, index) =>
			prisma.taskSubtask.update({
				where: {
					id: remainingSubtask.id,
				},
				data: {
					stackOrder: index,
				},
			}),
		),
		prisma.taskSubtask.update({
			where: {
				id: subtask.id,
			},
			data: {
				stackOrder: remainingSubtasks.length,
			},
		}),
	]);

	revalidateTaskViews();
}

export async function startTaskTimer(taskId: string) {
	const userId = await requireUserId();

	await startTaskSession(userId, taskId);

	revalidatePath("/downtime");
	revalidateTaskViews();
}

export async function stopTaskTimer(taskId: string) {
	const userId = await requireUserId();

	await stopActiveTaskSessionAndStartOther(userId, taskId);

	revalidatePath("/downtime");
	revalidateTaskViews();
}

export async function completeTask(taskId: string) {
	const userId = await requireUserId();

	const today = getAppTodayDate();

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			userId,
			isActive: true,
		},
	});

	if (!task) return;

	await stopActiveTaskSessionAndStartOther(userId, taskId);

	await prisma.taskCompletion.upsert({
		where: {
			taskId_completedOn: {
				taskId,
				completedOn: today,
			},
		},
		update: {},
		create: {
			taskId,
			userId,
			completedOn: today,
		},
	});

	if (task.groupId) {
		const groupTasks = await prisma.task.findMany({
			where: {
				userId,
				groupId: task.groupId,
				isActive: true,
				id: {
					not: task.id,
				},
			},
			orderBy: {
				stackOrder: "asc",
			},
		});

		await prisma.$transaction([
			...groupTasks.map((groupTask, index) =>
				prisma.task.update({
					where: {
						id: groupTask.id,
					},
					data: {
						stackOrder: index,
					},
				})
			),
			prisma.task.update({
				where: {
					id: task.id,
				},
				data: {
					stackOrder: groupTasks.length,
				},
			}),
		]);
	}

	revalidateTaskViews();
	revalidatePath("/downtime");
}

export async function undoTodayCompletion(taskId: string) {
	const userId = await requireUserId();
	const today = getAppTodayDate();

	await prisma.taskCompletion.deleteMany({
		where: {
			taskId,
			userId,
			completedOn: today,
		},
	});

	revalidateTaskViews();
}
