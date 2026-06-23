import AppNav from "@/components/AppNav";
import CollapsibleSection from "@/components/CollapsibleSection";
import DeleteConfirmationForm from "@/components/DeleteConfirmationForm";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";
import { prisma } from "@/lib/prisma";
import {
	createDailyCheck,
	deleteDailyCheck,
	updateDailyCheck,
} from "@/app/actions/daily-review";
import {
	createChallenge,
	deleteChallenge,
	updateChallenge,
} from "@/app/actions/challenges";
import {
	addTaskSubtask,
	createTask,
	createTaskGroup,
	deleteTask,
	deleteTaskGroup,
	deleteTaskSubtask,
	updateTask,
	updateTaskGroup,
	updateTaskSubtask,
} from "@/app/actions/tasks";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { formatAppDate, getAppDateKey, getAppTodayDate } from "@/lib/app-date";
import { getChallengeProgress } from "@/lib/challenges";

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
			subtasks: {
				where: {
					isActive: true,
				},
				orderBy: {
					stackOrder: "asc",
				},
			},
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

	const dailyChecks = await prisma.dailyCheck.findMany({
		where: {
			userId: session.user.id,
			isActive: true,
			challenge: null,
		},
		orderBy: {
			sortOrder: "asc",
		},
	});
	const today = getAppTodayDate();
	const challenges = await prisma.challenge.findMany({
		where: {
			userId: session.user.id,
			isActive: true,
		},
		orderBy: {
			startDay: "asc",
		},
		include: {
			dailyCheck: {
				include: {
					results: {
						orderBy: {
							targetDay: "desc",
						},
					},
				},
			},
		},
	});
	const challengeProgress = challenges.map((challenge) =>
		getChallengeProgress(challenge, today),
	);

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

					<CollapsibleSection
						title="Add Task"
						summary="Create a stack item with optional subtasks and playbook notes"
						storageKey="tasks:add-task"
						className="mt-8"
					>
						<form
							action={createTask}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
						<div className="space-y-4">
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
									Playbook
								</label>

								<textarea
									name="playbook"
									placeholder="Add reminders, steps, mindset cues, or mistakes to avoid before doing this task."
									className="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
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

							<div>
								<label className="text-sm font-medium text-slate-300">
									Subtasks
								</label>

								<textarea
									name="subtasks"
									placeholder="Write one subtask per line"
									className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
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
					</CollapsibleSection>

					<CollapsibleSection
						title="Add Task Group"
						summary="Create a group for rotating related tasks"
						defaultOpen={false}
						storageKey="tasks:add-group"
					>
						<form
							action={createTaskGroup}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
						<div className="space-y-4">
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
					</CollapsibleSection>

					<CollapsibleSection
						title="Add Daily Check"
						summary="Create a yesterday-review question"
						defaultOpen={false}
						storageKey="tasks:add-daily-check"
					>
						<form
							action={createDailyCheck}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
						<p className="text-sm text-slate-400">
							Daily checks are outcome questions answered the next day, like
							whether you stayed under a calorie limit or avoided late snacking.
						</p>

						<div className="mt-5 space-y-4">
							<div>
								<label className="text-sm font-medium text-slate-300">
									Check question
								</label>

								<input
									name="title"
									placeholder="Was below calorie limit?"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div>
								<label className="text-sm font-medium text-slate-300">
									Description
								</label>

								<textarea
									name="description"
									placeholder="Answer this during tomorrow's review."
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Daily Check
							</button>
							</div>
						</form>
					</CollapsibleSection>

					<CollapsibleSection
						title="Add Challenge"
						summary="Create a multi-day rule with streak tracking"
						defaultOpen={false}
						storageKey="tasks:add-challenge"
					>
						<form
							action={createChallenge}
							className="rounded-2xl border border-slate-800 bg-slate-900 p-6"
						>
						<p className="text-sm text-slate-400">
							Challenges are multi-day rules that create daily review prompts and
							track your streak.
						</p>

						<div className="mt-5 space-y-4">
							<div>
								<label className="text-sm font-medium text-slate-300">
									Challenge name
								</label>

								<input
									name="title"
									placeholder="Don't use social media"
									className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div>
								<label className="text-sm font-medium text-slate-300">
									Rules or notes
								</label>

								<textarea
									name="description"
									placeholder="Define what counts, allowed exceptions, and why this matters."
									className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
								/>
							</div>

							<div className="grid gap-4 sm:grid-cols-2">
								<div>
									<label className="text-sm font-medium text-slate-300">
										Start date
									</label>

									<input
										type="date"
										name="startDay"
										defaultValue={getAppDateKey(today)}
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>

								<div>
									<label className="text-sm font-medium text-slate-300">
										Duration days
									</label>

									<input
										type="number"
										name="durationDays"
										min="1"
										max="3650"
										defaultValue="90"
										className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
									/>
								</div>
							</div>

							<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
								Add Challenge
							</button>
							</div>
						</form>
					</CollapsibleSection>

					<CollapsibleSection
						title="Task Groups"
						summary={`${groups.length} active`}
						defaultOpen={false}
						storageKey="tasks:groups"
						className="mt-10"
					>
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
										<div className="mt-3">
											<DeleteConfirmationForm
												confirmAction={deleteTaskGroup.bind(null, group.id)}
												triggerLabel="Delete Group"
												itemLabel={`the group "${group.name}"`}
												confirmLabel="Delete Group"
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</CollapsibleSection>

					<CollapsibleSection
						title="Active Challenges"
						summary={`${challenges.length} active`}
						storageKey="tasks:challenges"
						className="mt-10"
					>
						{challenges.length === 0 ? (
							<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
								No challenges yet. Add one above to start tracking a streak.
							</div>
						) : (
							<div className="space-y-4">
								{challenges.map((challenge, index) => {
									const progress = challengeProgress[index];

									return (
										<div
											key={challenge.id}
											className="rounded-xl border border-slate-800 bg-slate-900 p-4"
										>
											<div className="mb-4 grid gap-3 sm:grid-cols-3">
												<div className="rounded-xl bg-slate-950 p-3">
													<p className="text-xs uppercase tracking-wide text-slate-500">
														Current Streak
													</p>
													<p className="mt-1 text-2xl font-bold text-sky-300">
														{progress.currentStreak} days
													</p>
												</div>

												<div className="rounded-xl bg-slate-950 p-3">
													<p className="text-xs uppercase tracking-wide text-slate-500">
														Progress
													</p>
													<p className="mt-1 text-2xl font-bold text-white">
														{progress.successfulDays}/{progress.durationDays}
													</p>
												</div>

												<div className="rounded-xl bg-slate-950 p-3">
													<p className="text-xs uppercase tracking-wide text-slate-500">
														Ends
													</p>
													<p className="mt-1 text-lg font-semibold text-slate-200">
														{formatAppDate(progress.endDay)}
													</p>
												</div>
											</div>

											<form action={updateChallenge} className="space-y-4">
												<input
													type="hidden"
													name="challengeId"
													value={challenge.id}
												/>

												<div>
													<label className="text-sm font-medium text-slate-300">
														Challenge name
													</label>

													<input
														name="title"
														defaultValue={challenge.title}
														className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
													/>
												</div>

												<div>
													<label className="text-sm font-medium text-slate-300">
														Rules or notes
													</label>

													<textarea
														name="description"
														defaultValue={challenge.description ?? ""}
														className="mt-2 min-h-28 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
													/>
												</div>

												<div className="grid gap-4 sm:grid-cols-2">
													<div>
														<label className="text-sm font-medium text-slate-300">
															Start date
														</label>

														<input
															type="date"
															name="startDay"
															defaultValue={getAppDateKey(challenge.startDay)}
															className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
														/>
													</div>

													<div>
														<label className="text-sm font-medium text-slate-300">
															Duration days
														</label>

														<input
															type="number"
															name="durationDays"
															min="1"
															max="3650"
															defaultValue={challenge.durationDays}
															className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
														/>
													</div>
												</div>

												<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
													Save Challenge
												</button>
											</form>

											<div className="mt-3">
												<DeleteConfirmationForm
													confirmAction={deleteChallenge.bind(null, challenge.id)}
													triggerLabel="Archive Challenge"
													itemLabel={`the challenge "${challenge.title}"`}
													confirmLabel="Archive Challenge"
												/>
											</div>
										</div>
									);
								})}
							</div>
						)}
					</CollapsibleSection>

					<CollapsibleSection
						title="Daily Checks"
						summary={`${dailyChecks.length} active`}
						defaultOpen={false}
						storageKey="tasks:daily-checks"
						className="mt-10"
					>
						{dailyChecks.length === 0 ? (
							<div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-slate-400">
								No daily checks yet. Add one above to start reviewing yesterday.
							</div>
						) : (
							<div className="space-y-4">
								{dailyChecks.map((check) => (
									<div
										key={check.id}
										className="rounded-xl border border-slate-800 bg-slate-900 p-4"
									>
										<form action={updateDailyCheck} className="space-y-4">
											<input
												type="hidden"
												name="dailyCheckId"
												value={check.id}
											/>

											<div>
												<label className="text-sm font-medium text-slate-300">
													Check question
												</label>

												<input
													name="title"
													defaultValue={check.title}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<div>
												<label className="text-sm font-medium text-slate-300">
													Description
												</label>

												<textarea
													name="description"
													defaultValue={check.description ?? ""}
													className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
												/>
											</div>

											<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
												Save Daily Check
											</button>
										</form>

										<div className="mt-3">
											<DeleteConfirmationForm
												confirmAction={deleteDailyCheck.bind(null, check.id)}
												triggerLabel="Delete Daily Check"
												itemLabel={`the daily check "${check.title}"`}
												confirmLabel="Delete Daily Check"
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</CollapsibleSection>

					<CollapsibleSection
						title="Active Tasks"
						summary={`${tasks.length} active`}
						storageKey="tasks:active"
						className="mt-10"
					>
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
													Playbook
												</label>

												<textarea
													name="playbook"
													defaultValue={task.playbook ?? ""}
													placeholder="Add reminders, steps, mindset cues, or mistakes to avoid before doing this task."
													className="mt-2 min-h-32 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-sky-500"
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

											<div className="flex flex-wrap gap-3">
												<button className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
													Save Task
												</button>

												<TaskPlaybookButton
													taskTitle={task.title}
													playbook={task.playbook}
												/>
											</div>
										</form>

										<div className="mt-5 border-t border-slate-800 pt-4">
											<h3 className="text-sm font-semibold text-slate-200">
												Subtasks
											</h3>

											{task.subtasks.length === 0 ? (
												<p className="mt-2 text-sm text-slate-500">
													No subtasks yet.
												</p>
											) : (
												<div className="mt-3 space-y-3">
													{task.subtasks.map((subtask) => (
														<div
															key={subtask.id}
															className="flex flex-col gap-2 rounded-xl border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center"
														>
															<form
																action={updateTaskSubtask}
																className="flex flex-1 flex-col gap-2 sm:flex-row"
															>
																<input
																	type="hidden"
																	name="subtaskId"
																	value={subtask.id}
																/>

																<input
																	name="title"
																	defaultValue={subtask.title}
																	className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
																/>

																<button className="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-slate-950 hover:bg-sky-400">
																	Save
																</button>
															</form>

															<DeleteConfirmationForm
																confirmAction={deleteTaskSubtask.bind(
																	null,
																	subtask.id,
																)}
																triggerLabel="Delete"
																itemLabel={`the subtask "${subtask.title}"`}
																confirmLabel="Delete Subtask"
															/>
														</div>
													))}
												</div>
											)}

											<form
												action={addTaskSubtask}
												className="mt-3 flex flex-col gap-2 sm:flex-row"
											>
												<input type="hidden" name="taskId" value={task.id} />

												<input
													name="title"
													placeholder="Add a subtask"
													className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-sky-500"
												/>

												<button className="rounded-lg border border-sky-500/50 px-3 py-2 text-sm font-semibold text-sky-200 hover:bg-sky-500/10">
													Add Subtask
												</button>
											</form>
										</div>

										<div className="mt-3">
											<DeleteConfirmationForm
												confirmAction={deleteTask.bind(null, task.id)}
												triggerLabel="Delete Task"
												itemLabel={`the task "${task.title}"`}
												confirmLabel="Delete Task"
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</CollapsibleSection>
				</section>
			</main>
		</>
	);
}
