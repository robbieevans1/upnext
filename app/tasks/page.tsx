import AppNav from "@/components/AppNav";
import { prisma } from "@/lib/prisma";
import {
	createTask,
	createTaskGroup,
	deleteTask,
	deleteTaskGroup,
	updateTask,
	updateTaskGroup,
} from "@/app/actions/tasks";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

// async function getDemoUser() {
// 	return prisma.user.upsert({
// 		where: {
// 			email: "demo@upnext.dev",
// 		},
// 		update: {},
// 		create: {
// 			id: "demo-user",
// 			email: "demo@upnext.dev",
// 			name: "Demo User",
// 		},
// 	});
// }

export default async function TasksPage() {
		const session = await getServerSession(authOptions);

	if (!session?.user) {
		redirect("/login");
	}
		// const user = await getDemoUser();

	const groups = await prisma.taskGroup.findMany({
		where: {
			userId: session.user.id,
			isActive: true,
		},
		orderBy: {
			createdAt: "asc",
		},
	});

	const tasks = await prisma.task.findMany({
		where: {
			userId: session.user.id,
			isActive: true,
		},
		include: {
			group: true,
		},
		orderBy: [
			{
				groupId: "asc",
			},
			{
				stackOrder: "asc",
			},
			{
				createdAt: "asc",
			},
		],
	});

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-3xl">
					<p className="mb-2 text-sm font-medium text-sky-400">Manage</p>

					<h1 className="text-4xl font-bold tracking-tight">Tasks</h1>

					<p className="mt-3 text-slate-400">
						Create task groups, add tasks, and manage your daily UpNext stack.
					</p>

					<form
						action={createTask}
						className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
					>
						<h2 className="text-xl font-bold">Add Task</h2>

						<div className="mt-5 space-y-4">
							<div>
								<label className="text-sm font-medium text-slate-300">
									Task name
								</label>

								<input
									name="title"
									placeholder="Portfolio Project"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div>
								<label className="text-sm font-medium text-slate-300">
									Description
								</label>

								<textarea
									name="description"
									placeholder="Work on this for at least 30 minutes"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div>
								<label className="text-sm font-medium text-slate-300">
									Task group
								</label>

								<select
									name="groupId"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									defaultValue=""
								>
									<option value="">No group</option>

									{groups.map((group) => (
										<option key={group.id} value={group.id}>
											{group.name}
										</option>
									))}
								</select>
							</div>

							<label className="flex items-center gap-3 text-sm text-slate-300">
								<input type="checkbox" name="isMandatory" />
								Mandatory daily task
							</label>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Task
							</button>
						</div>
					</form>

					<form
						action={createTaskGroup}
						className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6"
					>
						<h2 className="text-xl font-bold">Add Task Group</h2>

						<div className="mt-5 space-y-4">
							<div>
								<label className="text-sm font-medium text-slate-300">
									Group name
								</label>

								<input
									name="name"
									placeholder="Career"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div>
								<label className="text-sm font-medium text-slate-300">
									Description
								</label>

								<textarea
									name="description"
									placeholder="Tasks that move this area forward"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Group
							</button>
						</div>
					</form>

					<div className="mt-10">
						<h2 className="mb-4 text-xl font-bold">Task Groups</h2>

						{groups.length === 0 ? (
							<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
								No task groups yet.
							</div>
						) : (
							<div className="space-y-4">
								{groups.map((group) => (
									<div
										key={group.id}
										className="rounded-xl border border-slate-800 bg-slate-900 p-4"
									>
										<form action={updateTaskGroup} className="space-y-4">
											<input type="hidden" name="groupId" value={group.id} />

											<div>
												<label className="text-sm font-medium text-slate-300">
													Group name
												</label>

												<input
													name="name"
													defaultValue={group.name}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<div>
												<label className="text-sm font-medium text-slate-300">
													Description
												</label>

												<textarea
													name="description"
													defaultValue={group.description ?? ""}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<div className="flex gap-3">
												<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
													Save Group
												</button>
											</div>
										</form>
										<form
											action={deleteTaskGroup.bind(null, group.id)}
											className="mt-3"
										>
											<button className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
												Delete Group
											</button>
										</form>
									</div>
								))}
							</div>
						)}
					</div>

					<div className="mt-10">
						<h2 className="mb-4 text-xl font-bold">Active Tasks</h2>

						{tasks.length === 0 ? (
							<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
								No active tasks yet. Add your first task above.
							</div>
						) : (
							<div className="space-y-4">
								{tasks.map((task) => (
									<div
										key={task.id}
										className="rounded-xl border border-slate-800 bg-slate-900 p-4"
									>
										<form action={updateTask} className="space-y-4">
											<input type="hidden" name="taskId" value={task.id} />

											<div>
												<label className="text-sm font-medium text-slate-300">
													Task name
												</label>

												<input
													name="title"
													defaultValue={task.title}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<div>
												<label className="text-sm font-medium text-slate-300">
													Description
												</label>

												<textarea
													name="description"
													defaultValue={task.description ?? ""}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<div>
												<label className="text-sm font-medium text-slate-300">
													Task group
												</label>

												<select
													name="groupId"
													defaultValue={task.groupId ?? ""}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												>
													<option value="">No group</option>

													{groups.map((group) => (
														<option key={group.id} value={group.id}>
															{group.name}
														</option>
													))}
												</select>
											</div>

											<label className="flex items-center gap-3 text-sm text-slate-300">
												<input
													type="checkbox"
													name="isMandatory"
													defaultChecked={task.isMandatory}
												/>
												Mandatory daily task
											</label>

											<div className="flex flex-wrap gap-2">
												{task.group && (
													<span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
														{task.group.name}
													</span>
												)}

												{task.isMandatory && (
													<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
														Mandatory
													</span>
												)}

												{!task.isMandatory && task.groupId && (
													<span className="rounded-full bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-400">
														Rotating
													</span>
												)}

												{!task.groupId && !task.isMandatory && (
													<span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
														Ungrouped
													</span>
												)}
											</div>

											<div className="flex gap-3">
												<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
													Save Task
												</button>
											</div>
										</form>
										<form
											action={deleteTask.bind(null, task.id)}
											className="mt-3"
										>
											<button className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">
												Delete Task
											</button>
										</form>
									</div>
								))}
							</div>
						)}
					</div>
				</section>
			</main>
		</>
	);
}
