import AppNav from "@/components/AppNav";
import DailyReviewPrompt from "@/components/DailyReviewPrompt";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";
import TaskTimerControls from "@/components/TaskTimerControls";
import { completeActionItem } from "@/app/actions/action-items";
import {
	completeCommitment,
	completeCommitmentOccurrence,
} from "@/app/actions/commitments";
import { completeSubtask, undoTodayCompletion } from "@/app/actions/tasks";
import { getAppDayOfWeek, getWeekdayLabel } from "@/lib/commitments";
import { prisma } from "@/lib/prisma";
import { CommitmentRecurrence, Prisma } from "@prisma/client";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import {
	addAppDays,
	formatAppDate,
	formatAppTime,
	getAppDateKey,
	getAppTodayDate,
} from "@/lib/app-date";
import { connection } from "next/server";

type TaskWithLastCompletion = Prisma.TaskGetPayload<{
	include: {
		completions: true;
		subtasks: {
			include: {
				completions: true;
			};
		};
	};
}>;

type TaskStatus = "normal" | "stale" | "overdue";

type ActionItem = Prisma.ActionItemGetPayload<object>;
type Commitment = Prisma.CommitmentGetPayload<object>;
type TodayCommitment = Commitment & {
	occurrenceDay: Date;
	isRecurringOccurrence: boolean;
};

function getDaysSinceLastCompleted(
	lastCompleted: Date | undefined,
	today: Date,
) {
	if (!lastCompleted) {
		return null;
	}

	const lastCompletedDate = getAppTodayDate(lastCompleted);

	const diffInMs = today.getTime() - lastCompletedDate.getTime();

	return Math.floor(diffInMs / (1000 * 60 * 60 * 24));
}

function getTaskStatus(task: TaskWithLastCompletion, today: Date): TaskStatus {
	const lastCompleted = task.completions[0]?.completedOn;
	const daysSinceLastCompleted = getDaysSinceLastCompleted(
		lastCompleted,
		today,
	);

	if (daysSinceLastCompleted === null) {
		return "overdue";
	}

	if (daysSinceLastCompleted > 3) {
		return "overdue";
	}

	if (daysSinceLastCompleted === 3) {
		return "stale";
	}

	return "normal";
}

const taskRowStyles = {
	normal: "rounded-xl border border-slate-800 bg-slate-900 p-4",
	stale: "rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4",
	overdue: "rounded-xl border border-red-500/40 bg-red-500/10 p-4",
};

const currentTaskStyles = {
	normal:
		"mt-8 rounded-2xl border border-sky-500/40 bg-slate-900 p-6 shadow-lg",
	stale:
		"mt-8 rounded-2xl border border-yellow-500/40 bg-yellow-500/10 p-6 shadow-lg",
	overdue:
		"mt-8 rounded-2xl border border-red-500/40 bg-red-500/10 p-6 shadow-lg",
};

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

function getLastCompletedTime(task: TaskWithLastCompletion) {
	const lastCompleted = task.completions[0]?.completedOn;

	if (!lastCompleted) {
		return Number.NEGATIVE_INFINITY;
	}

	const lastCompletedDate = getAppTodayDate(lastCompleted);

	return lastCompletedDate.getTime();
}

function sortStack(tasks: TaskWithLastCompletion[]) {
	return [...tasks].sort((a, b) => {
		if (a.isMandatory !== b.isMandatory) {
			return Number(b.isMandatory) - Number(a.isMandatory);
		}

		const aLastCompleted = getLastCompletedTime(a);
		const bLastCompleted = getLastCompletedTime(b);

		if (aLastCompleted !== bLastCompleted) {
			return aLastCompleted - bLastCompleted;
		}

		return a.stackOrder - b.stackOrder;
	});
}

export default async function TodayPage() {
	await connection();

	const session = await getServerSession(authOptions);

	if (!session?.user) {
		redirect("/login");
	}
	// const user = await getDemoUser();
	const today = getAppTodayDate();
	const yesterday = addAppDays(today, -1);

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
		orderBy: {
			stackOrder: "asc",
		},
		include: {
			completions: {
				orderBy: {
					completedOn: "desc",
				},
				take: 1,
			},
			subtasks: {
				where: {
					isActive: true,
				},
				orderBy: {
					stackOrder: "asc",
				},
				include: {
					completions: {
						where: {
							completedOn: today,
						},
						take: 1,
					},
				},
			},
		},
	});

	const completionsToday = await prisma.taskCompletion.findMany({
		where: {
			userId: session.user.id,
			completedOn: today,
		},
	});

	const [oneTimeCommitmentsToday, recurringCommitmentsToday] =
		await Promise.all([
			prisma.commitment.findMany({
				where: {
					userId: session.user.id,
					day: today,
					recurrence: CommitmentRecurrence.NONE,
					completedAt: null,
					canceledAt: null,
				},
				orderBy: [
					{
						startsAt: "asc",
					},
					{
						createdAt: "asc",
					},
				],
			}),
			prisma.commitment.findMany({
				where: {
					userId: session.user.id,
					recurrence: CommitmentRecurrence.WEEKLY,
					recurrenceDayOfWeek: getAppDayOfWeek(today),
					day: {
						lte: today,
					},
					completedAt: null,
					canceledAt: null,
					occurrenceCompletions: {
						none: {
							occurrenceDay: today,
						},
					},
				},
				orderBy: [
					{
						startsAt: "asc",
					},
					{
						createdAt: "asc",
					},
				],
			}),
		]);
	const commitmentsToday: TodayCommitment[] = [
		...oneTimeCommitmentsToday.map((commitment) => ({
			...commitment,
			occurrenceDay: commitment.day,
			isRecurringOccurrence: false,
		})),
		...recurringCommitmentsToday.map((commitment) => ({
			...commitment,
			occurrenceDay: today,
			isRecurringOccurrence: true,
		})),
	].sort((a, b) => {
		const aTime = a.startsAt?.getTime() ?? 0;
		const bTime = b.startsAt?.getTime() ?? 0;

		if (aTime !== bTime) {
			return aTime - bTime;
		}

		return a.createdAt.getTime() - b.createdAt.getTime();
	});

	const actionItems = await prisma.actionItem.findMany({
		where: {
			userId: session.user.id,
			completedAt: null,
			canceledAt: null,
			OR: [
				{
					dueOn: null,
				},
				{
					dueOn: {
						lte: today,
					},
				},
			],
		},
		orderBy: [
			{
				dueOn: "asc",
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
		},
		orderBy: {
			sortOrder: "asc",
		},
		include: {
			results: {
				where: {
					targetDay: yesterday,
				},
				take: 1,
			},
		},
	});

	const dailyReviewDismissal = await prisma.dailyReviewDismissal.findUnique({
		where: {
			userId_targetDay: {
				userId: session.user.id,
				targetDay: yesterday,
			},
		},
	});

	const activeTaskSession = await prisma.taskSession.findFirst({
		where: {
			userId: session.user.id,
			stoppedAt: null,
		},
		select: {
			taskId: true,
			startedAt: true,
		},
		orderBy: {
			startedAt: "desc",
		},
	});

	const activeTaskTimer = activeTaskSession
		? {
				taskId: activeTaskSession.taskId,
				startedAt: activeTaskSession.startedAt.toISOString(),
			}
		: null;

	const completedTodayIds = completionsToday.map(
		(completion) => completion.taskId,
	);

	const completedTodayTasks = tasks.filter((task) =>
		completedTodayIds.includes(task.id),
	);

	const remainingTasks = tasks.filter(
		(task) => !completedTodayIds.includes(task.id),
	);

	const mandatoryTasks = sortStack(
		remainingTasks.filter((task) => task.isMandatory),
	);

	const ungroupedTasks = sortStack(
		remainingTasks.filter((task) => !task.isMandatory && !task.groupId),
	);

	const groupedTasks = groups
		.map((group) => {
			const groupTasks = sortStack(
				remainingTasks.filter(
					(task) => task.groupId === group.id && !task.isMandatory,
				),
			);

			return {
				group,
				tasks: groupTasks,
			};
		})
		.filter((groupStack) => groupStack.tasks.length > 0);

	const totalRemainingTasks = remainingTasks.length;
	const totalCompletedTasks = completedTodayTasks.length;
	const totalTasksToday = totalRemainingTasks + totalCompletedTasks;

	const progressPercent =
		totalTasksToday === 0
			? 0
			: Math.round((totalCompletedTasks / totalTasksToday) * 100);

	const currentTask =
		mandatoryTasks[0] ?? groupedTasks[0]?.tasks[0] ?? ungroupedTasks[0] ?? null;

	return (
		<>
			<AppNav />

			<main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
				<section className="mx-auto max-w-2xl">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="mb-2 text-sm font-medium text-sky-400">UpNext</p>

							<h1 className="text-4xl font-bold tracking-tight">
								Today&apos;s Stack
							</h1>

							<p className="mt-3 text-slate-400">
								Mandatory tasks stay first. Group tasks disappear after
								completion today, then return tomorrow at the bottom of their
								group stack.
							</p>
						</div>
					</div>

					<div className="mt-6">
						<div className="mb-2 flex items-center justify-between text-sm text-slate-400">
							<span>{totalCompletedTasks} completed</span>
							<span>{totalRemainingTasks} remaining</span>
						</div>

						<div className="h-3 overflow-hidden rounded-full bg-slate-800">
							<div
								className="h-full rounded-full bg-sky-500"
								style={{ width: `${progressPercent}%` }}
							/>
						</div>

						<p className="mt-2 text-sm text-slate-500">
							{progressPercent}% done today
						</p>
					</div>

					<DailyReviewPrompt
						targetDayKey={getAppDateKey(yesterday)}
						targetDayLabel={formatAppDate(yesterday)}
						wasDismissed={Boolean(dailyReviewDismissal)}
						checks={dailyChecks.map((check) => ({
							id: check.id,
							title: check.title,
							description: check.description,
							result: check.results[0]?.status ?? null,
						}))}
					/>

					{currentTask ? (
						<CurrentTaskCard
							task={currentTask}
							today={today}
							activeTaskSession={activeTaskTimer}
						/>
					) : (
						<div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
							<p className="text-sm font-semibold uppercase tracking-wide text-emerald-400">
								Stack Clear
							</p>

							<h2 className="mt-3 text-3xl font-bold">Nice work.</h2>

							<p className="mt-2 text-emerald-100/80">
								You completed everything in today&apos;s stack.
							</p>
						</div>
					)}

					{commitmentsToday.length > 0 && (
						<StackSection title="Scheduled Today">
							{commitmentsToday.map((commitment) => (
								<CommitmentRow key={commitment.id} commitment={commitment} />
							))}
						</StackSection>
					)}

					{actionItems.length > 0 && (
						<StackSection title="Action Items">
							{actionItems.map((item) => (
								<ActionItemRow key={item.id} item={item} today={today} />
							))}
						</StackSection>
					)}

					{mandatoryTasks.length > 0 && (
						<StackSection title="Mandatory">
							{mandatoryTasks.map((task) => (
								<TaskRow
									key={task.id}
									task={task}
									badge="Required"
									today={today}
									activeTaskSession={activeTaskTimer}
								/>
							))}
						</StackSection>
					)}

					{groupedTasks.map(({ group, tasks }) => (
						<StackSection key={group.id} title={group.name}>
							{group.description && (
								<p className="mb-3 text-sm text-slate-500">
									{group.description}
								</p>
							)}

							{tasks.map((task, index) => (
								<TaskRow
									key={task.id}
									task={task}
									badge={index === 0 ? "Up next" : "In stack"}
									today={today}
									activeTaskSession={activeTaskTimer}
								/>
							))}
						</StackSection>
					))}

					{ungroupedTasks.length > 0 && (
						<StackSection title="Ungrouped">
							{ungroupedTasks.map((task) => (
								<TaskRow
									key={task.id}
									task={task}
									badge="Single task"
									today={today}
									activeTaskSession={activeTaskTimer}
								/>
							))}
						</StackSection>
					)}

					{completedTodayTasks.length > 0 && (
						<div className="mt-10 border-t border-slate-800 pt-6">
							<h3 className="mb-4 text-lg font-semibold text-slate-200">
								Completed Today
							</h3>

							<div className="space-y-3">
								{completedTodayTasks.map((task) => {
									const group = groups.find(
										(group) => group.id === task.groupId,
									);

									return (
										<div
											key={task.id}
											className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4"
										>
											<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
												<div className="min-w-0">
													<h4 className="text-lg font-semibold text-emerald-100">
														{task.title}
													</h4>

													<p className="mt-1 text-sm text-emerald-200/70">
														Completed today
														{group ? ` · ${group.name}` : ""}
													</p>
												</div>

												<div className="flex min-w-0 flex-wrap items-center gap-2">
													<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
														Done
													</span>

													<TaskTimerControls
														taskId={task.id}
														taskTitle={task.title}
														playbook={task.playbook}
														activeTaskSession={activeTaskTimer}
														isCompleted
														completeButtonClassName="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
														startButtonClassName="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-60"
													/>

													<form
														action={undoTodayCompletion.bind(null, task.id)}
														className="min-w-0"
													>
														<button className="rounded-lg border border-emerald-400/40 px-3 py-1.5 text-sm font-medium text-emerald-100 hover:bg-emerald-500/10">
															Undo
														</button>
													</form>
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</div>
					)}
				</section>
			</main>
		</>
	);
}

function CommitmentRow({ commitment }: { commitment: TodayCommitment }) {
	const completeAction = commitment.isRecurringOccurrence
		? completeCommitmentOccurrence.bind(
				null,
				commitment.id,
				getAppDateKey(commitment.occurrenceDay),
			)
		: completeCommitment.bind(null, commitment.id);

	return (
		<div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h4 className="break-words text-lg font-semibold">
						{commitment.title}
					</h4>

					{commitment.description && (
						<p className="mt-1 text-sm text-slate-300">
							{commitment.description}
						</p>
					)}

					<p className="mt-2 text-sm text-indigo-100/80">
						{formatCommitmentWindow(commitment)}
						{commitment.location ? ` · ${commitment.location}` : ""}
					</p>

					{commitment.isRecurringOccurrence && (
						<p className="mt-1 text-xs font-medium text-indigo-200/70">
							Repeats weekly on{" "}
							{getWeekdayLabel(commitment.recurrenceDayOfWeek)}
						</p>
					)}
				</div>

				<div className="flex min-w-0 flex-wrap gap-2 sm:shrink-0">
					<TaskPlaybookButton
						taskTitle={commitment.title}
						playbook={commitment.playbook}
					/>

					<form action={completeAction}>
						<button className="rounded-lg border border-indigo-300/40 px-4 py-2 text-sm font-medium text-indigo-100 hover:bg-indigo-500/10">
							Complete
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

function ActionItemRow({ item, today }: { item: ActionItem; today: Date }) {
	const isOverdue = item.dueOn ? item.dueOn.getTime() < today.getTime() : false;

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h4 className="break-words text-lg font-semibold">{item.title}</h4>

					{item.description && (
						<p className="mt-1 text-sm text-slate-400">{item.description}</p>
					)}

					<div className="mt-3 flex flex-wrap gap-2">
						<span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
							One-off
						</span>

						{item.dueOn && (
							<span
								className={`rounded-full px-3 py-1 text-xs font-medium ${
									isOverdue
										? "bg-red-500/10 text-red-300"
										: "bg-sky-500/10 text-sky-400"
								}`}
							>
								Due {formatAppDate(item.dueOn)}
							</span>
						)}
					</div>
				</div>

				<div className="flex min-w-0 flex-wrap gap-2 sm:shrink-0">
					<TaskPlaybookButton taskTitle={item.title} playbook={item.playbook} />

					<form action={completeActionItem.bind(null, item.id)}>
						<button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400">
							Complete
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}

function formatCommitmentWindow(commitment: Commitment) {
	if (commitment.startsAt && commitment.endsAt) {
		return `${formatAppTime(commitment.startsAt)}-${formatAppTime(commitment.endsAt)}`;
	}

	if (commitment.startsAt) {
		return formatAppTime(commitment.startsAt);
	}

	return "Any time today";
}

function CurrentTaskCard({
	task,
	today,
	activeTaskSession,
}: {
	task: TaskWithLastCompletion;
	today: Date;
	activeTaskSession: {
		taskId: string;
		startedAt: string;
	} | null;
}) {
	const lastCompleted = task.completions[0]?.completedOn;
	const status = getTaskStatus(task, today);

	return (
		<div className={currentTaskStyles[status]}>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
						Current Priority
					</p>

					<h2 className="mt-3 break-words text-3xl font-bold">{task.title}</h2>

					<p className="mt-2 text-slate-300">
						{task.isMandatory
							? "Required daily"
							: task.groupId
								? "Group stack"
								: "Single task"}
					</p>

					<p className="mt-3 text-sm text-slate-500">
						Last completed:{" "}
						{lastCompleted ? formatAppDate(lastCompleted) : "Never"}
					</p>
				</div>

				<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
					Recommended
				</span>
			</div>

			<div className="mt-6 flex min-w-0 flex-wrap gap-3">
				<TaskTimerControls
					taskId={task.id}
					taskTitle={task.title}
					playbook={task.playbook}
					activeTaskSession={activeTaskSession}
					completeButtonClassName="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
					startButtonClassName="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
				/>
			</div>

			<SubtaskChecklist task={task} />
		</div>
	);
}

function StackSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mt-8">
			<h3 className="mb-4 text-lg font-semibold text-slate-200">{title}</h3>

			<div className="space-y-3">{children}</div>
		</div>
	);
}

function TaskRow({
	task,
	badge,
	today,
	activeTaskSession,
}: {
	task: TaskWithLastCompletion;
	badge: string;
	today: Date;
	activeTaskSession: {
		taskId: string;
		startedAt: string;
	} | null;
}) {
	const lastCompleted = task.completions[0]?.completedOn;
	const status = getTaskStatus(task, today);

	return (
		<div className={taskRowStyles[status]}>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h4 className="break-words text-lg font-semibold">{task.title}</h4>

					{task.description && (
						<p className="mt-1 text-sm text-slate-400">{task.description}</p>
					)}

					<p className="mt-2 text-sm text-slate-500">
						Last completed:{" "}
						{lastCompleted ? formatAppDate(lastCompleted) : "Never"}
					</p>

					<div className="mt-3 flex flex-wrap gap-2">
						<span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
							{badge}
						</span>

						{status === "stale" && (
							<span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">
								Stale
							</span>
						)}

						{status === "overdue" && (
							<span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-medium text-red-300">
								Overdue
							</span>
						)}

						{task.isMandatory && (
							<span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-400">
								Mandatory
							</span>
						)}

						{!task.isMandatory && task.groupId && (
							<span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-300">
								Rotating
							</span>
						)}
					</div>
				</div>

				<TaskTimerControls
					taskId={task.id}
					taskTitle={task.title}
					playbook={task.playbook}
					activeTaskSession={activeTaskSession}
					completeButtonClassName="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
					startButtonClassName="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
				/>
			</div>

			<SubtaskChecklist task={task} />
		</div>
	);
}

function SubtaskChecklist({ task }: { task: TaskWithLastCompletion }) {
	if (task.subtasks.length === 0) {
		return null;
	}

	return (
		<div className="mt-5 border-t border-slate-800 pt-4">
			<h5 className="text-sm font-semibold text-slate-200">Subtasks</h5>

			<div className="mt-3 space-y-2">
				{task.subtasks.map((subtask) => {
					const isComplete = subtask.completions.length > 0;

					return (
						<div
							key={subtask.id}
							className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
						>
							<div className="flex min-w-0 items-center gap-2">
								<span
									className={`h-2.5 w-2.5 shrink-0 rounded-full ${
										isComplete ? "bg-emerald-400" : "bg-slate-600"
									}`}
								/>

								<span
									className={`text-sm ${
										isComplete
											? "text-slate-500 line-through"
											: "text-slate-200"
									}`}
								>
									{subtask.title}
								</span>
							</div>

							{isComplete ? (
								<span className="self-start rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 sm:self-auto">
									Done
								</span>
							) : (
								<form action={completeSubtask.bind(null, subtask.id)}>
									<button className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400">
										Complete
									</button>
								</form>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
