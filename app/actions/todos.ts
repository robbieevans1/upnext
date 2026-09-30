"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";

function validateTitle(title: string) {
	const trimmed = title.trim();
	if (!trimmed || trimmed.length > 300) {
		throw new Error("Enter a to-do between 1 and 300 characters.");
	}
	return trimmed;
}

export async function createTodo(title: string) {
	const userId = await requireUserId();
	await prisma.todo.create({ data: { userId, title: validateTitle(title) } });
	revalidatePath("/todos");
}

export async function updateTodo(id: string, title: string) {
	const userId = await requireUserId();
	await prisma.todo.updateMany({
		where: { id, userId },
		data: { title: validateTitle(title) },
	});
	revalidatePath("/todos");
}

export async function setTodoCompleted(id: string, completed: boolean) {
	const userId = await requireUserId();
	await prisma.todo.updateMany({
		where: { id, userId },
		data: { completedAt: completed ? new Date() : null },
	});
	revalidatePath("/todos");
}

export async function deleteTodo(id: string) {
	const userId = await requireUserId();
	await prisma.todo.deleteMany({ where: { id, userId } });
	revalidatePath("/todos");
}
