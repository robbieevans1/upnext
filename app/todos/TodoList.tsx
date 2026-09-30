"use client";

import { useState, useTransition } from "react";
import { createTodo, deleteTodo, setTodoCompleted, updateTodo } from "@/app/actions/todos";

type Todo = { id: string; title: string; completed: boolean };
const buttonStyle = "rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50";
const inputStyle = "min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white focus:border-sky-500";

export default function TodoList({ todos }: { todos: Todo[] }) {
	const [title, setTitle] = useState("");
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editTitle, setEditTitle] = useState("");
	const [error, setError] = useState("");
	const [pending, startTransition] = useTransition();

	function run(action: () => Promise<void>) {
		setError("");
		startTransition(async () => {
			try {
				await action();
			} catch {
				setError("Could not save your change. Please try again.");
			}
		});
	}

	return (
		<div className="mt-8 space-y-8" aria-busy={pending}>
			<form className="rounded-xl border border-slate-800 bg-slate-900 p-4" onSubmit={(event) => {
				event.preventDefault();
				run(async () => { await createTodo(title); setTitle(""); });
			}}>
				<label htmlFor="new-todo" className="mb-3 block font-semibold">Add a to-do</label>
				<div className="flex flex-wrap gap-2">
					<input id="new-todo" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={300} disabled={pending} placeholder="What needs doing?" className={inputStyle} />
					<button disabled={pending || !title.trim()} className={buttonStyle}>Add</button>
				</div>
			</form>
			{error && <p role="alert" className="text-red-300">{error}</p>}
			{[false, true].map((completed) => {
				const items = todos.filter((todo) => todo.completed === completed);
				return (
					<section key={String(completed)} aria-label={completed ? "Completed" : "To do"}>
						<h2 className="mb-4 text-xl font-bold">{completed ? "Completed" : "To do"} <span className="text-slate-400">({items.length})</span></h2>
						{items.length === 0 ? <p className="text-slate-400">{completed ? "Completed items will appear here." : "Nothing to do yet. Add an item above."}</p> : (
							<ul className="space-y-3">
								{items.map((todo) => (
									<li key={todo.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
										{editingId === todo.id ? (
											<form className="flex flex-wrap gap-2" onSubmit={(event) => {
												event.preventDefault();
												run(async () => { await updateTodo(todo.id, editTitle); setEditingId(null); });
											}}>
												<input aria-label="Edit to-do" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} required maxLength={300} disabled={pending} className={inputStyle} autoFocus />
												<button disabled={pending || !editTitle.trim()} className={buttonStyle}>Save</button>
												<button type="button" disabled={pending} onClick={() => setEditingId(null)} className={buttonStyle}>Cancel</button>
											</form>
										) : (
											<div className="flex flex-wrap items-center gap-3">
												<label className="flex min-w-0 flex-1 items-center gap-3">
													<input type="checkbox" checked={todo.completed} disabled={pending} onChange={(event) => run(() => setTodoCompleted(todo.id, event.target.checked))} className="h-5 w-5 shrink-0 accent-sky-500" />
													<span className={`break-words ${completed ? "text-slate-400 line-through" : "text-white"}`}>{todo.title}</span>
												</label>
												<button disabled={pending} onClick={() => { setEditingId(todo.id); setEditTitle(todo.title); }} className={buttonStyle}>Edit</button>
												<button disabled={pending} onClick={() => run(() => deleteTodo(todo.id))} className={`${buttonStyle} text-red-300`} aria-label={`Delete ${todo.title}`}>Delete</button>
											</div>
										)}
									</li>
								))}
							</ul>
						)}
					</section>
				);
			})}
		</div>
	);
}
