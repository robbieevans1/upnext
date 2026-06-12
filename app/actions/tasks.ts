"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

const DEMO_USER_ID = "demo-user";

function getTodayDate() {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

async function getDemoUser() {
	return prisma.user.upsert({
		where: {
			email: "demo@upnext.dev",
		},
		update: {},
		create: {
			id: DEMO_USER_ID,
			email: "demo@upnext.dev",
			name: "Demo User",
		},
	});
}

export async function createTaskGroup(formData: FormData) {
	const user = await getDemoUser();

	const name = String(formData.get("name") ?? "");
	const description = String(formData.get("description") ?? "");

	if (!name.trim()) return;

	await prisma.taskGroup.create({
		data: {
			name,
			description,
			userId: user.id,
		},
	});

	revalidatePath("/");
	revalidatePath("/tasks");
}

export async function updateTaskGroup(formData: FormData) {
	const groupId = String(formData.get("groupId") ?? "");
	const name = String(formData.get("name") ?? "");
	const description = String(formData.get("description") ?? "");

	if (!groupId || !name.trim()) return;

	await prisma.taskGroup.update({
		where: {
			id: groupId,
		},
		data: {
			name,
			description,
		},
	});

	revalidatePath("/");
	revalidatePath("/tasks");
}

export async function deleteTaskGroup(groupId: string) {
	await prisma.taskGroup.update({
		where: {
			id: groupId,
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

	revalidatePath("/");
	revalidatePath("/tasks");
}

export async function createTask(formData: FormData) {
	const user = await getDemoUser();

	const title = String(formData.get("title") ?? "");
	const description = String(formData.get("description") ?? "");
	const groupIdValue = String(formData.get("groupId") ?? "");
	const isMandatory = formData.get("isMandatory") === "on";

	if (!title.trim()) return;

	const groupId = groupIdValue || null;

	const existingTasksInStack = await prisma.task.count({
		where: {
			userId: user.id,
			isActive: true,
			groupId,
		},
	});

	await prisma.task.create({
		data: {
			title,
			description,
			isMandatory,
			groupId,
			userId: user.id,
			stackOrder: existingTasksInStack,
		},
	});

	revalidatePath("/");
	revalidatePath("/tasks");
}

export async function updateTask(formData: FormData) {
	const taskId = String(formData.get("taskId") ?? "");
	const title = String(formData.get("title") ?? "");
	const description = String(formData.get("description") ?? "");
	const groupIdValue = String(formData.get("groupId") ?? "");
	const isMandatory = formData.get("isMandatory") === "on";

	if (!taskId || !title.trim()) return;

	await prisma.task.update({
		where: {
			id: taskId,
		},
		data: {
			title,
			description,
			isMandatory,
			groupId: groupIdValue || null,
		},
	});

	revalidatePath("/");
	revalidatePath("/tasks");
}

export async function deleteTask(taskId: string) {
	await prisma.task.update({
		where: {
			id: taskId,
		},
		data: {
			isActive: false,
		},
	});

	revalidatePath("/");
	revalidatePath("/tasks");
}

export async function completeTask(taskId: string) {
	const user = await getDemoUser();
	const today = getTodayDate();

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			userId: user.id,
			isActive: true,
		},
	});

	if (!task) return;

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
			userId: user.id,
			completedOn: today,
		},
	});

	if (task.groupId) {
		const groupTasks = await prisma.task.findMany({
			where: {
				userId: user.id,
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
				}),
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

	revalidatePath("/");
	revalidatePath("/tasks");
}
