"use server";

import { revalidatePath } from "next/cache";
import { setFlashNotification } from "@/lib/flash-notifications";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";
import { getUserEffectiveTodayDate } from "@/lib/effective-day";
import {
	startTaskSession,
	stopActiveTaskSessionAndStartOther,
} from "@/lib/time-tracking";
import { Prisma } from "@prisma/client";

// const DEMO_USER_ID = "demo-user";

function revalidateTaskViews() {
	revalidatePath("/");
	revalidatePath("/today");
	revalidatePath("/tasks");
}

function revalidateTaskTimeViews() {
	revalidateTaskViews();
	revalidatePath("/dashboard");
	revalidatePath("/history");
}

function getSubtaskTitles(formData: FormData) {
	return String(formData.get("subtasks") ?? "")
		.split(/\r?\n/)
		.map((title) => title.trim())
		.filter(Boolean);
}

function getTaskSessionDurationSeconds(session: {
	startedAt: Date;
	stoppedAt: Date | null;
}) {
	if (!session.stoppedAt) {
		return 0;
	}

	return Math.max(
		0,
		Math.floor((session.stoppedAt.getTime() - session.startedAt.getTime()) / 1000),
	);
}

function getTotalMinutes(formData: FormData) {
	const totalMinutes = Number(formData.get("totalMinutes"));

	if (!Number.isFinite(totalMinutes)) {
		return null;
	}

	const roundedMinutes = Math.round(totalMinutes);

	return roundedMinutes >= 0 && roundedMinutes <= 24 * 60
		? roundedMinutes
		: null;
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

	await setFlashNotification("Task group created.");
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

	await setFlashNotification("Task group updated.");
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

	await setFlashNotification("Task group deleted.");
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

	await setFlashNotification("Task created.");
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

	await setFlashNotification("Task updated.");
	revalidateTaskViews();
}

export async function updateTaskPlaybook(formData: FormData) {
	const userId = await requireUserId();
	const taskId = String(formData.get("taskId") ?? "");
	const playbook = String(formData.get("playbook") ?? "").trim();

	if (!taskId) return;

	await prisma.task.updateMany({
		where: {
			id: taskId,
			userId,
			isActive: true,
		},
		data: {
			playbook,
		},
	});

	await setFlashNotification("Task playbook updated.");
	revalidateTaskViews();
}

export async function adjustCompletedTaskTime(formData: FormData) {
	const userId = await requireUserId();
	const taskId = String(formData.get("taskId") ?? "");
	const totalMinutes = getTotalMinutes(formData);

	if (!taskId || totalMinutes === null) return;

	const { today } = await getUserEffectiveTodayDate(userId);

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			userId,
			isActive: true,
			completions: {
				some: {
					completedOn: today,
				},
			},
		},
		select: {
			id: true,
		},
	});

	if (!task) return;

	const activeSession = await prisma.taskSession.findFirst({
		where: {
			taskId,
			userId,
			day: today,
			stoppedAt: null,
		},
		select: {
			id: true,
		},
	});

	if (activeSession) return;

	const sessions = await prisma.taskSession.findMany({
		where: {
			taskId,
			userId,
			day: today,
			stoppedAt: {
				not: null,
			},
		},
		orderBy: {
			startedAt: "asc",
		},
		select: {
			id: true,
			startedAt: true,
			stoppedAt: true,
		},
	});

	const desiredTotalSeconds = totalMinutes * 60;
	const currentTotalSeconds = sessions.reduce(
		(total, session) => total + getTaskSessionDurationSeconds(session),
		0,
	);

	if (desiredTotalSeconds === currentTotalSeconds) return;

	if (desiredTotalSeconds > currentTotalSeconds) {
		const additionalSeconds = desiredTotalSeconds - currentTotalSeconds;

		await prisma.taskSession.create({
			data: {
				taskId,
				userId,
				day: today,
				startedAt: today,
				stoppedAt: new Date(today.getTime() + additionalSeconds * 1000),
			},
		});

		await setFlashNotification("Task time updated.");
		revalidateTaskTimeViews();
		return;
	}

	let secondsToRemove = currentTotalSeconds - desiredTotalSeconds;
	const operations: Prisma.PrismaPromise<unknown>[] = [];

	for (const session of [...sessions].reverse()) {
		if (secondsToRemove <= 0) {
			break;
		}

		const durationSeconds = getTaskSessionDurationSeconds(session);

		if (durationSeconds <= secondsToRemove) {
			operations.push(
				prisma.taskSession.delete({
					where: {
						id: session.id,
					},
				}),
			);
			secondsToRemove -= durationSeconds;
			continue;
		}

		if (!session.stoppedAt) {
			continue;
		}

		operations.push(
			prisma.taskSession.update({
				where: {
					id: session.id,
				},
				data: {
					stoppedAt: new Date(
						session.stoppedAt.getTime() - secondsToRemove * 1000,
					),
				},
			}),
		);
		secondsToRemove = 0;
	}

	if (operations.length > 0) {
		await prisma.$transaction(operations);
	}

	await setFlashNotification("Task time updated.");
	revalidateTaskTimeViews();
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

	await setFlashNotification("Task deleted.");
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

	await setFlashNotification("Subtask added.");
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

	await setFlashNotification("Subtask updated.");
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

	await setFlashNotification("Subtask deleted.");
	revalidateTaskViews();
}

export async function completeSubtask(subtaskId: string) {
	const userId = await requireUserId();
	const { today } = await getUserEffectiveTodayDate(userId);

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

	await setFlashNotification("Subtask completed.");
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

	const { today } = await getUserEffectiveTodayDate(userId);

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

	await setFlashNotification("Task completed.");
	revalidateTaskViews();
	revalidatePath("/downtime");
}

export async function undoTodayCompletion(taskId: string) {
	const userId = await requireUserId();
	const { today } = await getUserEffectiveTodayDate(userId);

	await prisma.taskCompletion.deleteMany({
		where: {
			taskId,
			userId,
			completedOn: today,
		},
	});

	await setFlashNotification("Task completion undone.");
	revalidateTaskViews();
}
