import AppNav from "@/components/AppNav";
import TaskPlaybookButton from "@/components/TaskPlaybookButton";
import { completeActionItem } from "@/app/actions/action-items";
import { completeCommitment } from "@/app/actions/commitments";
import { completeTask, undoTodayCompletion } from "@/app/actions/tasks";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { formatAppDate, formatAppTime, getAppTodayDate } from "@/lib/app-date";
import { connection } from "next/server";

type TaskWithLastCompletion = Prisma.TaskGetPayload<{
	include: {
		completions: true;
	};
}>;

type TaskStatus = "normal" | "stale" | "overdue";

type ActionItem = Prisma.ActionItemGetPayload<object>;
type Commitment = Prisma.CommitmentGetPayload<object>;

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
		},
	});

	const completionsToday = await prisma.taskCompletion.findMany({
		where: {
			userId: session.user.id,
			completedOn: today,
		},
	});

	const commitmentsToday = await prisma.commitment.findMany({
		where: {
			userId: session.user.id,
			day: today,
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

					{currentTask ? (
						<CurrentTaskCard task={currentTask} today={today} />
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
											<div className="flex items-center justify-between gap-4">
												<div>
													<h4 className="text-lg font-semibold text-emerald-100">
														{task.title}
													</h4>

													<p className="mt-1 text-sm text-emerald-200/70">
														Completed today
														{group ? ` · ${group.name}` : ""}
													</p>
												</div>

												<div className="flex items-center gap-2">
													<span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
														Done
													</span>

													<TaskPlaybookButton
														taskTitle={task.title}
														playbook={task.playbook}
													/>

													<form action={undoTodayCompletion.bind(null, task.id)}>
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

function CommitmentRow({ commitment }: { commitment: Commitment }) {
	return (
		<div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-4">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h4 className="text-lg font-semibold">{commitment.title}</h4>

					{commitment.description && (
						<p className="mt-1 text-sm text-slate-300">
							{commitment.description}
						</p>
					)}

					<p className="mt-2 text-sm text-indigo-100/80">
						{formatCommitmentWindow(commitment)}
						{commitment.location ? ` · ${commitment.location}` : ""}
					</p>
				</div>

				<div className="flex shrink-0 flex-wrap gap-2">
					<TaskPlaybookButton
						taskTitle={commitment.title}
						playbook={commitment.playbook}
					/>

					<form action={completeCommitment.bind(null, commitment.id)}>
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
			<div className="flex items-start justify-between gap-4">
				<div>
					<h4 className="text-lg font-semibold">{item.title}</h4>

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

				<div className="flex shrink-0 flex-wrap gap-2">
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
}: {
	task: TaskWithLastCompletion;
	today: Date;
}) {
	const lastCompleted = task.completions[0]?.completedOn;
	const status = getTaskStatus(task, today);

	return (
		<div className={currentTaskStyles[status]}>
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-sm font-semibold uppercase tracking-wide text-sky-400">
						Current Priority
					</p>

					<h2 className="mt-3 text-3xl font-bold">{task.title}</h2>

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

			<div className="mt-6 flex flex-wrap gap-3">
				<form action={completeTask.bind(null, task.id)}>
					<button className="rounded-xl bg-sky-500 px-5 py-3 font-semibold text-slate-950 hover:bg-sky-400">
						Complete
					</button>
				</form>

				<TaskPlaybookButton
					taskTitle={task.title}
					playbook={task.playbook}
				/>
			</div>
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
}: {
	task: TaskWithLastCompletion;
	badge: string;
	today: Date;
}) {
	const lastCompleted = task.completions[0]?.completedOn;
	const status = getTaskStatus(task, today);

	return (
		<div className={taskRowStyles[status]}>
			<div className="flex items-start justify-between gap-4">
				<div>
					<h4 className="text-lg font-semibold">{task.title}</h4>

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

				<div className="flex shrink-0 flex-wrap gap-2">
					<TaskPlaybookButton
						taskTitle={task.title}
						playbook={task.playbook}
					/>

					<form action={completeTask.bind(null, task.id)}>
						<button className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:border-sky-500 hover:text-sky-400">
							Complete
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
