"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAppTodayDate } from "@/lib/app-date";

// const DEMO_USER_ID = "demo-user";

function revalidateTaskViews() {
	revalidatePath("/");
	revalidatePath("/today");
	revalidatePath("/tasks");
}

async function getCurrentUserId() {
	const session = await getServerSession(authOptions);

	if (!session?.user?.id) {
		redirect("/login");
	}

	return session.user.id;
}
// async function getDemoUser() {
// 	return prisma.user.upsert({
// 		where: {
// 			email: "demo@upnext.dev",
// 		},
// 		update: {},
// 		create: {
// 			id: DEMO_USER_ID,
// 			email: "demo@upnext.dev",
// 			name: "Demo User",
// 		},
// 	});
// }

export async function createTaskGroup(formData: FormData) {
	const userId = await getCurrentUserId();

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

	revalidateTaskViews();
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

	revalidateTaskViews();
}

export async function createTask(formData: FormData) {
	const userId = await getCurrentUserId();

	const title = String(formData.get("title") ?? "").trim();
	const description = String(formData.get("description") ?? "").trim();
	const playbook = String(formData.get("playbook") ?? "").trim();
	const groupIdValue = String(formData.get("groupId") ?? "");
	const isMandatory = formData.get("isMandatory") === "on";

	if (!title) return;

	const groupId = groupIdValue || null;

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
		},
	});

	revalidateTaskViews();
}

export async function updateTask(formData: FormData) {
	const taskId = String(formData.get("taskId") ?? "");
	const title = String(formData.get("title") ?? "");
	const description = String(formData.get("description") ?? "");
	const playbook = String(formData.get("playbook") ?? "");
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
			playbook,
			isMandatory,
			groupId: groupIdValue || null,
		},
	});

	revalidateTaskViews();
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

	revalidateTaskViews();
}

export async function completeTask(taskId: string) {
	const userId = await getCurrentUserId();

	const today = getAppTodayDate();

	const task = await prisma.task.findFirst({
		where: {
			id: taskId,
			userId,
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
}

export async function undoTodayCompletion(taskId: string) {
	const userId = await getCurrentUserId();
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
