import { connection } from "next/server";
import AppNav from "@/components/AppNav";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/server-auth";
import TodoList from "./TodoList";

export default async function TodosPage() {
	await connection();
	const userId = await requireUserId();
	const todos = await prisma.todo.findMany({
		where: { userId },
		orderBy: [{ createdAt: "desc" }, { id: "asc" }],
	});

	return (
		<>
			<AppNav />
			<main className="min-h-screen bg-slate-950 px-4 py-10 text-white sm:px-6">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Plan</p>
					<h1 className="text-4xl font-bold tracking-tight">To-do list</h1>
					<p className="mt-3 text-slate-400">Keep track of the things you want to get done. Your list is saved to your account.</p>
					<TodoList todos={todos.map((todo) => ({ id: todo.id, title: todo.title, completed: todo.completedAt !== null }))} />
				</section>
			</main>
		</>
	);
}
